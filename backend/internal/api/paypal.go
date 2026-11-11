package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/bidline/backend/internal/store"
)

func (s *Server) handlePayPalOrder(w http.ResponseWriter, r *http.Request) {
	if !s.allow(r, "paypal", 20, time.Minute) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many payment attempts. Try again shortly.")
		return
	}
	var body struct {
		Amount int `json:"amount"`
	}
	_ = decodeBody(r, &body)

	deal, err := s.store.GetDealForUser(r.Context(), r.PathValue("id"), currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	if deal.ClientUserID != currentUser(r).ID {
		writeError(w, http.StatusForbidden, "not_client", "Only the client can fund this deal.")
		return
	}
	remaining := deal.Amount - deal.Escrow
	if remaining <= 0 {
		writeError(w, http.StatusBadRequest, "fully_funded", "This deal is already fully funded.")
		return
	}
	amount := store.FromDollars(body.Amount)
	if body.Amount <= 0 || amount > remaining {
		amount = remaining
	}

	order, err := s.paypal.CreateOrder(r.Context(), deal.ID, amount, "Bidline escrow · "+deal.Title)
	if err != nil {
		log.Printf("paypal create order: %v", err)
		writeError(w, http.StatusBadGateway, "paypal_error", "PayPal could not create the order. Try again.")
		return
	}
	if err := s.store.SavePayPalOrder(r.Context(), store.PayPalOrder{
		DealID:        deal.ID,
		UserID:        currentUser(r).ID,
		PayPalOrderID: order.ID,
		Amount:        amount,
		Status:        order.Status,
		ApprovalURL:   order.ApprovalURL,
	}); err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"orderId":     order.ID,
		"approvalUrl": order.ApprovalURL,
		"amount":      amount.Dollars(),
		"dealId":      deal.ID,
		"mode":        s.paypal.Mode(),
		"mock":        order.Mock,
	})
}

func (s *Server) handlePayPalCapture(w http.ResponseWriter, r *http.Request) {
	if !s.allow(r, "paypal", 20, time.Minute) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many payment attempts. Try again shortly.")
		return
	}
	var body struct {
		OrderID string `json:"orderId"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if strings.TrimSpace(body.OrderID) == "" {
		writeError(w, http.StatusBadRequest, "order_required", "PayPal order id is required.")
		return
	}
	order, err := s.store.GetPayPalOrder(r.Context(), body.OrderID)
	if err != nil {
		storeError(w, err)
		return
	}
	if order.UserID != currentUser(r).ID || order.DealID != r.PathValue("id") {
		writeError(w, http.StatusNotFound, "not_found", "That payment does not belong to this deal.")
		return
	}
	deal, err := s.store.GetDealForUser(r.Context(), order.DealID, currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	if order.Status == "COMPLETED" {
		writeJSON(w, http.StatusOK, map[string]any{"status": "completed", "deal": deal, "mode": s.paypal.Mode()})
		return
	}

	capture, err := s.paypal.CaptureOrder(r.Context(), order.PayPalOrderID)
	if err != nil {
		log.Printf("paypal capture: %v", err)
		writeError(w, http.StatusBadGateway, "paypal_error", "PayPal could not capture the order. Try again.")
		return
	}
	claimed, err := s.store.ClaimPayPalOrder(r.Context(), order.PayPalOrderID)
	if err != nil {
		storeError(w, err)
		return
	}
	if !claimed {
		writeError(w, http.StatusConflict, "payment_processing", "This payment is already being processed. Refresh the deal in a moment.")
		return
	}
	updated, err := s.store.FundEscrow(r.Context(), order.DealID, order.UserID, order.Amount, "PayPal")
	if err != nil {
		_ = s.store.UpdatePayPalOrderStatus(r.Context(), order.PayPalOrderID, "FAILED")
		log.Printf("paypal captured but escrow funding failed: %v", err)
		writeError(w, http.StatusConflict, "funding_failed", "PayPal captured the payment but the escrow update failed. Support can reconcile it.")
		return
	}
	_ = s.store.UpdatePayPalOrderStatus(r.Context(), order.PayPalOrderID, "COMPLETED")
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "completed",
		"captureId": capture.CaptureID,
		"deal":      updated,
		"mode":      s.paypal.Mode(),
	})
}

type paypalWebhook struct {
	ID        string `json:"id"`
	EventType string `json:"event_type"`
	Resource  struct {
		ID                string `json:"id"`
		Status            string `json:"status"`
		SupplementaryData struct {
			RelatedIDs struct {
				OrderID   string `json:"order_id"`
				CaptureID string `json:"capture_id"`
			} `json:"related_ids"`
		} `json:"supplementary_data"`
	} `json:"resource"`
}

func (s *Server) handlePayPalWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "Could not read the webhook payload.")
		return
	}
	if err := s.paypal.VerifyWebhook(r.Context(), r.Header, body); err != nil {
		log.Printf("paypal webhook rejected: %v", err)
		writeError(w, http.StatusBadRequest, "invalid_signature", "Webhook signature verification failed.")
		return
	}
	var event paypalWebhook
	if err := json.Unmarshal(body, &event); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "Webhook payload is not valid JSON.")
		return
	}
	if event.ID == "" {
		event.ID = event.EventType + ":" + event.Resource.ID
	}
	fresh, err := s.store.RecordWebhook(r.Context(), "paypal", event.ID, string(body))
	if err != nil {
		log.Printf("record paypal webhook: %v", err)
	}
	if !fresh {
		writeJSON(w, http.StatusOK, map[string]bool{"received": true, "duplicate": true})
		return
	}

	switch event.EventType {
	case "PAYMENT.CAPTURE.COMPLETED":
		orderID := event.Resource.SupplementaryData.RelatedIDs.OrderID
		if orderID != "" {
			if err := s.settlePayPalOrder(r.Context(), orderID); err != nil {
				log.Printf("settle paypal order %s: %v", orderID, err)
			}
		}
	case "CHECKOUT.ORDER.APPROVED":
		_ = s.store.UpdatePayPalOrderStatus(r.Context(), event.Resource.ID, "APPROVED")
	case "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED":
		_ = s.store.UpdatePayPalOrderStatus(r.Context(), event.Resource.SupplementaryData.RelatedIDs.OrderID, "FAILED")
	}
	writeJSON(w, http.StatusOK, map[string]bool{"received": true})
}

func (s *Server) settlePayPalOrder(ctx context.Context, orderID string) error {
	if strings.TrimSpace(orderID) == "" {
		return nil
	}
	order, err := s.store.GetPayPalOrder(ctx, orderID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil
		}
		return err
	}
	if order.Status == "COMPLETED" {
		return nil
	}
	claimed, err := s.store.ClaimPayPalOrder(ctx, orderID)
	if err != nil || !claimed {
		return err
	}
	if _, err := s.store.FundEscrow(ctx, order.DealID, order.UserID, order.Amount, "PayPal"); err != nil {
		_ = s.store.UpdatePayPalOrderStatus(ctx, orderID, "FAILED")
		return err
	}
	return s.store.UpdatePayPalOrderStatus(ctx, orderID, "COMPLETED")
}
