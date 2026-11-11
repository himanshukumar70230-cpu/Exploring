package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/bidline/backend/internal/config"
)

// Client talks to the Gemini REST API. When no API key is configured the
// feature layer falls back to deterministic local reasoning so the product is
// still fully usable in development.
type Client struct {
	apiKey string
	models []string
	http   *http.Client
}

func New(cfg config.Config) *Client {
	models := make([]string, 0, len(cfg.GeminiFallbackModels)+1)
	seen := map[string]bool{}
	for _, candidate := range append([]string{cfg.GeminiModel}, cfg.GeminiFallbackModels...) {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" || seen[candidate] {
			continue
		}
		seen[candidate] = true
		models = append(models, candidate)
	}
	return &Client{
		apiKey: strings.TrimSpace(cfg.GeminiAPIKey),
		models: models,
		http:   &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) Enabled() bool { return c.apiKey != "" }

func (c *Client) Model() string {
	if len(c.models) == 0 {
		return ""
	}
	return c.models[0]
}

type geminiRequest struct {
	SystemInstruction *geminiContent  `json:"system_instruction,omitempty"`
	Contents          []geminiContent `json:"contents"`
	GenerationConfig  map[string]any  `json:"generationConfig,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	PromptFeedback struct {
		BlockReason string `json:"blockReason"`
	} `json:"promptFeedback"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Generate asks the primary model for a completion and walks the configured
// fallback models when the request fails for a transient reason (capacity,
// rate limits, timeouts). It returns the text and the model that produced it.
func (c *Client) Generate(ctx context.Context, system, prompt string, jsonMode bool) (string, string, error) {
	if !c.Enabled() {
		return "", "", errors.New("gemini is not configured")
	}
	payload := geminiRequest{
		Contents: []geminiContent{{
			Role:  "user",
			Parts: []geminiPart{{Text: prompt}},
		}},
		GenerationConfig: map[string]any{
			"temperature":     0.6,
			"maxOutputTokens": 4096,
		},
	}
	if system != "" {
		payload.SystemInstruction = &geminiContent{Parts: []geminiPart{{Text: system}}}
	}
	if jsonMode {
		payload.GenerationConfig["responseMimeType"] = "application/json"
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	failures := make([]string, 0, len(c.models))
	for _, model := range c.models {
		text, transient, err := c.generateWithModel(ctx, model, body)
		if err == nil {
			return text, model, nil
		}
		failures = append(failures, model+": "+err.Error())
		if !transient || ctx.Err() != nil {
			break
		}
	}
	return "", "", errors.New(strings.Join(failures, "; "))
}

// generateWithModel performs one request and reports whether the failure is
// worth retrying on another model.
func (c *Client) generateWithModel(ctx context.Context, model string, body []byte) (string, bool, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", false, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-goog-api-key", c.apiKey)

	response, err := c.http.Do(request)
	if err != nil {
		return "", ctx.Err() == nil, fmt.Errorf("gemini request: %w", err)
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return "", true, err
	}
	var parsed geminiResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", true, fmt.Errorf("gemini response: %w", err)
	}
	if response.StatusCode != http.StatusOK {
		transient := response.StatusCode == http.StatusTooManyRequests ||
			response.StatusCode >= 500
		if parsed.Error.Message != "" {
			return "", transient, fmt.Errorf("gemini: %s", parsed.Error.Message)
		}
		return "", transient, fmt.Errorf("gemini: status %d", response.StatusCode)
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		if parsed.PromptFeedback.BlockReason != "" {
			return "", false, fmt.Errorf("gemini blocked the prompt: %s", parsed.PromptFeedback.BlockReason)
		}
		return "", false, errors.New("gemini returned no candidates")
	}
	var text strings.Builder
	for _, part := range parsed.Candidates[0].Content.Parts {
		text.WriteString(part.Text)
	}
	return strings.TrimSpace(text.String()), false, nil
}
