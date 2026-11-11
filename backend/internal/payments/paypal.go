package payments

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/bidline/backend/internal/config"
	"github.com/bidline/backend/internal/store"
)

// PayPal talks to the REST Orders and Payouts APIs. In mock mode it returns
// deterministic sandbox-shaped responses so the entire escrow flow can be
// exercised without credentials.
type PayPal struct {
	cfg  config.Config
	http *http.Client
	base string

	mu      sync.Mutex
	token   string
	expires time.Time
}

type Order struct {
	ID          string
	Status      string
	ApprovalURL string
	Amount      store.Money
	Mock        bool
}

type Capture struct {
	OrderID   string
	CaptureID string
	Status    string
}

func New(cfg config.Config) *PayPal {
	base := "https://api-m.sandbox.paypal.com"
	switch strings.ToLower(cfg.PayPalMode) {
	case "live", "production":
		base = "https://api-m.paypal.com"
	}
	return &PayPal{
		cfg:  cfg,
		http: &http.Client{Timeout: 30 * time.Second},
		base: base,
	}
}

func (p *PayPal) Mock() bool {
	mode := strings.ToLower(strings.TrimSpace(p.cfg.PayPalMode))
	return mode == "" || mode == "mock" || p.cfg.PayPalClientID == "" || p.cfg.PayPalClientSecret == ""
}

func (p *PayPal) Mode() string {
	if p.Mock() {
		return "mock"
	}
	return strings.ToLower(p.cfg.PayPalMode)
}

func (p *PayPal) CreateOrder(ctx context.Context, dealID string, amount store.Money, description string) (*Order, error) {
	if amount <= 0 {
		return nil, errors.New("order amount must be greater than zero")
	}
	returnURL := withDeal(p.cfg.PayPalReturnURL, dealID)
	cancelURL := withDeal(p.cfg.PayPalCancelURL, dealID)
	if p.Mock() {
		id := mockID("ORDER")
		return &Order{
			ID:          id,
			Status:      "CREATED",
			ApprovalURL: appendQuery(returnURL, "paypal=mock-approved&token="+url.QueryEscape(id)),
			Amount:      amount,
			Mock:        true,
		}, nil
	}

	token, err := p.accessToken(ctx)
	if err != nil {
		return nil, err
	}
	body := map[string]any{
		"intent": "CAPTURE",
		"purchase_units": []map[string]any{{
			"reference_id": dealID,
			"description":  truncate(description, 120),
			"amount": map[string]string{
				"currency_code": "USD",
				"value":         amount.Decimal(),
			},
		}},
		"application_context": map[string]string{
			"brand_name":  "Bidline",
			"user_action": "PAY_NOW",
			"return_url":  returnURL,
			"cancel_url":  cancelURL,
		},
	}
	var parsed struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Links  []struct {
			Href string `json:"href"`
			Rel  string `json:"rel"`
		} `json:"links"`
	}
	if err := p.do(ctx, http.MethodPost, "/v2/checkout/orders", token, body, &parsed); err != nil {
		return nil, err
	}
	order := &Order{ID: parsed.ID, Status: parsed.Status, Amount: amount}
	for _, link := range parsed.Links {
		if link.Rel == "approve" || link.Rel == "payer-action" {
			order.ApprovalURL = link.Href
		}
	}
	return order, nil
}

func (p *PayPal) CaptureOrder(ctx context.Context, orderID string) (*Capture, error) {
	if orderID == "" {
		return nil, errors.New("order id is required")
	}
	if p.Mock() {
		return &Capture{OrderID: orderID, CaptureID: mockID("CAPTURE"), Status: "COMPLETED"}, nil
	}
	token, err := p.accessToken(ctx)
	if err != nil {
		return nil, err
	}
	var parsed struct {
		ID            string `json:"id"`
		Status        string `json:"status"`
		PurchaseUnits []struct {
			Payments struct {
				Captures []struct {
					ID     string `json:"id"`
					Status string `json:"status"`
				} `json:"captures"`
			} `json:"payments"`
		} `json:"purchase_units"`
	}
	if err := p.do(ctx, http.MethodPost, "/v2/checkout/orders/"+url.PathEscape(orderID)+"/capture", token, map[string]any{}, &parsed); err != nil {
		return nil, err
	}
	result := &Capture{OrderID: parsed.ID, Status: parsed.Status}
	if len(parsed.PurchaseUnits) > 0 && len(parsed.PurchaseUnits[0].Payments.Captures) > 0 {
		result.CaptureID = parsed.PurchaseUnits[0].Payments.Captures[0].ID
		result.Status = parsed.PurchaseUnits[0].Payments.Captures[0].Status
	}
	if !strings.EqualFold(result.Status, "COMPLETED") {
		return nil, fmt.Errorf("paypal capture status: %s", result.Status)
	}
	return result, nil
}

func (p *PayPal) Payout(ctx context.Context, receiverEmail string, amount store.Money, note string) (string, error) {
	if p.Mock() {
		return mockID("PAYOUT"), nil
	}
	if strings.TrimSpace(receiverEmail) == "" {
		return "", errors.New("receiver email is required for a payout")
	}
	token, err := p.accessToken(ctx)
	if err != nil {
		return "", err
	}
	body := map[string]any{
		"sender_batch_header": map[string]string{
			"sender_batch_id": mockID("BATCH"),
			"email_subject":   "Your Bidline payout",
			"email_message":   note,
		},
		"items": []map[string]any{{
			"recipient_type": "EMAIL",
			"receiver":       receiverEmail,
			"amount": map[string]string{
				"value":    amount.Decimal(),
				"currency": "USD",
			},
			"note": note,
		}},
	}
	var parsed struct {
		BatchHeader struct {
			PayoutBatchID string `json:"payout_batch_id"`
		} `json:"batch_header"`
	}
	if err := p.do(ctx, http.MethodPost, "/v1/payments/payouts", token, body, &parsed); err != nil {
		return "", err
	}
	return parsed.BatchHeader.PayoutBatchID, nil
}

// VerifyWebhook calls PayPal's verification endpoint. Mock mode accepts any
// payload so local webhook testing works without a registered webhook.
func (p *PayPal) VerifyWebhook(ctx context.Context, headers http.Header, body []byte) error {
	if p.Mock() {
		return nil
	}
	if p.cfg.PayPalWebhookID == "" {
		return errors.New("PAYPAL_WEBHOOK_ID is required to verify webhooks")
	}
	var event any
	if err := json.Unmarshal(body, &event); err != nil {
		return fmt.Errorf("invalid webhook payload: %w", err)
	}
	payload := map[string]any{
		"auth_algo":         headers.Get("paypal-auth-algo"),
		"cert_url":          headers.Get("paypal-cert-url"),
		"transmission_id":   headers.Get("paypal-transmission-id"),
		"transmission_sig":  headers.Get("paypal-transmission-sig"),
		"transmission_time": headers.Get("paypal-transmission-time"),
		"webhook_id":        p.cfg.PayPalWebhookID,
		"webhook_event":     event,
	}
	token, err := p.accessToken(ctx)
	if err != nil {
		return err
	}
	var parsed struct {
		VerificationStatus string `json:"verification_status"`
	}
	if err := p.do(ctx, http.MethodPost, "/v1/notifications/verify-webhook-signature", token, payload, &parsed); err != nil {
		return err
	}
	if !strings.EqualFold(parsed.VerificationStatus, "SUCCESS") {
		return errors.New("paypal webhook signature verification failed")
	}
	return nil
}

func (p *PayPal) accessToken(ctx context.Context) (string, error) {
	p.mu.Lock()
	if p.token != "" && time.Now().Before(p.expires.Add(-time.Minute)) {
		token := p.token
		p.mu.Unlock()
		return token, nil
	}
	p.mu.Unlock()

	form := url.Values{"grant_type": {"client_credentials"}}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, p.base+"/v1/oauth2/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	request.SetBasicAuth(p.cfg.PayPalClientID, p.cfg.PayPalClientSecret)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := p.http.Do(request)
	if err != nil {
		return "", fmt.Errorf("paypal oauth: %w", err)
	}
	defer response.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("paypal oauth: status %d: %s", response.StatusCode, truncate(string(raw), 200))
	}
	var parsed struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	if parsed.AccessToken == "" {
		return "", errors.New("paypal oauth returned an empty token")
	}
	p.mu.Lock()
	p.token = parsed.AccessToken
	p.expires = time.Now().Add(time.Duration(parsed.ExpiresIn) * time.Second)
	p.mu.Unlock()
	return parsed.AccessToken, nil
}

func (p *PayPal) do(ctx context.Context, method, path, token string, body any, target any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, method, p.base+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", "application/json")
	response, err := p.http.Do(request)
	if err != nil {
		return fmt.Errorf("paypal request: %w", err)
	}
	defer response.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("paypal: status %d: %s", response.StatusCode, truncate(string(raw), 300))
	}
	if target == nil {
		return nil
	}
	if err := json.Unmarshal(raw, target); err != nil {
		return fmt.Errorf("paypal response: %w", err)
	}
	return nil
}

func mockID(prefix string) string {
	buffer := make([]byte, 6)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return prefix + "-" + strings.ToUpper(hex.EncodeToString(buffer))
}

func withDeal(base, dealID string) string {
	if strings.TrimSpace(dealID) == "" {
		return base
	}
	return appendQuery(base, "deal="+url.QueryEscape(dealID))
}

func appendQuery(base, query string) string {
	if strings.TrimSpace(base) == "" {
		return base
	}
	separator := "?"
	if strings.Contains(base, "?") {
		separator = "&"
	}
	return base + separator + query
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}
