package store

import (
	"context"
	"database/sql"
	"errors"
)

func (s *Store) SavePayPalOrder(ctx context.Context, order PayPalOrder) error {
	ts := now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO paypal_orders (id, deal_id, user_id, paypal_order_id, amount_cents, status, approval_url, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		newID("PPO-"), order.DealID, order.UserID, order.PayPalOrderID, int(order.Amount), order.Status, order.ApprovalURL, ts, ts,
	)
	return err
}

func (s *Store) GetPayPalOrder(ctx context.Context, orderID string) (*PayPalOrder, error) {
	var order PayPalOrder
	var amount int
	err := s.db.QueryRowContext(ctx, `
		SELECT id, deal_id, user_id, paypal_order_id, amount_cents, status, approval_url
		FROM paypal_orders WHERE paypal_order_id = ?`, orderID).
		Scan(&order.ID, &order.DealID, &order.UserID, &order.PayPalOrderID, &amount, &order.Status, &order.ApprovalURL)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	order.Amount = Money(amount)
	return &order, nil
}

func (s *Store) UpdatePayPalOrderStatus(ctx context.Context, orderID, status string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE paypal_orders SET status = ?, updated_at = ? WHERE paypal_order_id = ?`, status, now(), orderID)
	return err
}

// ClaimPayPalOrder atomically moves an open order into processing so a capture
// and a webhook cannot both release the same funds.
func (s *Store) ClaimPayPalOrder(ctx context.Context, orderID string) (bool, error) {
	result, err := s.db.ExecContext(ctx, `
		UPDATE paypal_orders SET status = 'processing', updated_at = ?
		WHERE paypal_order_id = ? AND status IN ('CREATED', 'APPROVED')`, now(), orderID)
	if err != nil {
		return false, err
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}

// RecordWebhook returns true when the event is new. Duplicate deliveries are
// ignored, which makes PayPal's at-least-once webhooks safe.
func (s *Store) RecordWebhook(ctx context.Context, provider, eventID, payload string) (bool, error) {
	result, err := s.db.ExecContext(ctx, `
		INSERT INTO webhook_events (id, provider, event_id, payload, created_at)
		VALUES (?, ?, ?, ?, ?) ON CONFLICT(event_id) DO NOTHING`,
		newID("WH-"), provider, eventID, payload, now())
	if err != nil {
		return false, err
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}
