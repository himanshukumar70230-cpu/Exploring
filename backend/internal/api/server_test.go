package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/bidline/backend/internal/ai"
	"github.com/bidline/backend/internal/api"
	"github.com/bidline/backend/internal/auth"
	"github.com/bidline/backend/internal/config"
	"github.com/bidline/backend/internal/payments"
	"github.com/bidline/backend/internal/store"
)

func newTestServer(t *testing.T) (*httptest.Server, *store.Store) {
	t.Helper()
	db, err := store.Open(filepath.Join(t.TempDir(), "api-test.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	cfg := config.Config{
		AppEnv:         "test",
		Port:           "0",
		FrontendURL:    "http://localhost:3000",
		AuthDevMode:    true,
		DevAuthSecret:  "test-secret",
		DevAuthEmail:   "demo@bidline.dev",
		GeminiModel:    "gemini-2.5-flash",
		PayPalMode:     "mock",
		PlatformFeeBPS: 150,
	}
	server := api.New(cfg, db, auth.New(cfg), ai.New(cfg), payments.New(cfg))
	testServer := httptest.NewServer(server.Handler())
	t.Cleanup(testServer.Close)
	return testServer, db
}

func request(t *testing.T, client *http.Client, method, url, token string, body any) (int, map[string]any) {
	t.Helper()
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		reader = bytes.NewReader(payload)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var decoded map[string]any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &decoded)
	}
	return resp.StatusCode, decoded
}

func TestAuthGateAndCoreFlows(t *testing.T) {
	testServer, _ := newTestServer(t)
	client := testServer.Client()

	if status, _ := request(t, client, http.MethodGet, testServer.URL+"/healthz", "", nil); status != http.StatusOK {
		t.Fatalf("health status %d", status)
	}
	if status, _ := request(t, client, http.MethodGet, testServer.URL+"/v1/jobs", "", nil); status != http.StatusUnauthorized {
		t.Fatalf("expected jobs to be protected, got %d", status)
	}
	if status, _ := request(t, client, http.MethodGet, testServer.URL+"/v1/deals", "not-a-token", nil); status != http.StatusUnauthorized {
		t.Fatalf("expected invalid token rejection, got %d", status)
	}

	status, login := request(t, client, http.MethodPost, testServer.URL+"/v1/auth/dev", "", map[string]string{})
	if status != http.StatusOK {
		t.Fatalf("dev login status %d: %v", status, login)
	}
	token, _ := login["token"].(string)
	if token == "" {
		t.Fatal("missing dev token")
	}

	status, jobs := request(t, client, http.MethodGet, testServer.URL+"/v1/jobs", token, nil)
	if status != http.StatusOK {
		t.Fatalf("list jobs status %d: %v", status, jobs)
	}
	if count, _ := jobs["count"].(float64); count != 6 {
		t.Fatalf("expected 6 seeded jobs, got %v", jobs["count"])
	}

	status, wallet := request(t, client, http.MethodGet, testServer.URL+"/v1/wallet", token, nil)
	if status != http.StatusOK || wallet["available"] == nil {
		t.Fatalf("wallet status %d: %v", status, wallet)
	}

	status, created := request(t, client, http.MethodPost, testServer.URL+"/v1/jobs", token, map[string]any{
		"title":       "Ship a pricing page refresh",
		"category":    "Design",
		"description": "Refresh the pricing page with clearer packaging and a responsive build.",
		"company":     "Northstar Studio",
		"budgetMin":   3000,
		"budgetMax":   5000,
		"deadline":    "20 Dec 2026",
		"skills":      []string{"Web design", "Next.js"},
		"scope":       []string{"Audit the current page", "Design and build three tiers"},
	})
	if status != http.StatusCreated {
		t.Fatalf("create job status %d: %v", status, created)
	}
	jobID, _ := created["id"].(string)
	if jobID == "" {
		t.Fatal("missing job id")
	}

	status, blocked := request(t, client, http.MethodPost, testServer.URL+"/v1/jobs/"+jobID+"/ai/bid", token, map[string]string{"agentId": "atlas"})
	if status != http.StatusForbidden {
		t.Fatalf("expected own-brief AI bid rejection, got %d: %v", status, blocked)
	}

	status, aiResult := request(t, client, http.MethodPost, testServer.URL+"/v1/jobs/ai-support-agent/ai/bid", token, map[string]string{"agentId": "atlas"})
	if status != http.StatusOK {
		t.Fatalf("ai bid status %d: %v", status, aiResult)
	}
	if aiResult["provider"] != "heuristic" {
		t.Fatalf("expected heuristic fallback, got %v", aiResult["provider"])
	}

	status, deals := request(t, client, http.MethodGet, testServer.URL+"/v1/deals", token, nil)
	if status != http.StatusOK {
		t.Fatalf("deals status %d: %v", status, deals)
	}
	if count, _ := deals["count"].(float64); count != 2 {
		t.Fatalf("expected 2 deals for demo user, got %v", deals["count"])
	}

	status, meta := request(t, client, http.MethodGet, testServer.URL+"/v1/meta", "", nil)
	if status != http.StatusOK {
		t.Fatalf("meta status %d", status)
	}
	authMeta, _ := meta["auth"].(map[string]any)
	if authMeta["dev"] != true {
		t.Fatalf("expected dev auth enabled in test, got %v", meta["auth"])
	}
}

func TestMilestoneAndEscrowFlow(t *testing.T) {
	testServer, _ := newTestServer(t)
	client := testServer.Client()
	_, login := request(t, client, http.MethodPost, testServer.URL+"/v1/auth/dev", "", nil)
	token := login["token"].(string)

	// Demo user is the client on DL-2047. Fund it, ask the freelancer to submit via
	// a direct store handle is not available here, so verify funding and access.
	status, deal := request(t, client, http.MethodGet, testServer.URL+"/v1/deals/DL-2047", token, nil)
	if status != http.StatusOK {
		t.Fatalf("get deal status %d: %v", status, deal)
	}

	status, funded := request(t, client, http.MethodPost, testServer.URL+"/v1/deals/DL-2047/escrow", token, map[string]any{"amount": 2450})
	if status != http.StatusOK {
		t.Fatalf("fund escrow status %d: %v", status, funded)
	}
	if escrow, _ := funded["escrow"].(float64); escrow != 2450 {
		t.Fatalf("expected $2,450 escrow, got %v", funded["escrow"])
	}

	status, paypalOrder := request(t, client, http.MethodPost, testServer.URL+"/v1/deals/DL-2047/paypal/order", token, map[string]any{"amount": 1000})
	if status != http.StatusCreated {
		t.Fatalf("paypal order status %d: %v", status, paypalOrder)
	}
	orderID, _ := paypalOrder["orderId"].(string)
	if orderID == "" {
		t.Fatal("missing paypal order id")
	}
	status, captured := request(t, client, http.MethodPost, testServer.URL+"/v1/deals/DL-2047/paypal/capture", token, map[string]string{"orderId": orderID})
	if status != http.StatusOK {
		t.Fatalf("paypal capture status %d: %v", status, captured)
	}
	if captured["status"] != "completed" {
		t.Fatalf("expected completed capture, got %v", captured["status"])
	}

	// The demo user is not the freelancer on DL-2047.
	status, _ = request(t, client, http.MethodPost, testServer.URL+"/v1/deals/DL-2047/milestones/MS-DL-2047-1/submit", token, nil)
	if status != http.StatusBadRequest && status != http.StatusForbidden {
		t.Fatalf("expected submission rejection, got %d", status)
	}
}
