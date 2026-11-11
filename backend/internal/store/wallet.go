package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

func (s *Store) ListTransactions(ctx context.Context, userID string, limit int) ([]Transaction, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, deal_id, type, amount_cents, status, rail, description, counterparty, external_id, date_text, created_at
		 FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Transaction{}
	for rows.Next() {
		var item Transaction
		var amount int
		var dealID sql.NullString
		var dateText string
		if err := rows.Scan(
			&item.ID, &dealID, &item.Type, &amount, &item.Status, &item.Rail,
			&item.Description, &item.Counterparty, &item.ExternalID, &dateText, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		item.Amount = Money(amount)
		if dateText != "" {
			item.Date = dateText
		} else {
			item.Date = humanTime(item.CreatedAt)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) WalletFor(ctx context.Context, userID string) (*Wallet, error) {
	wallet := &Wallet{Currency: "USD", Transactions: []Transaction{}}

	var available, inEscrow, pending int
	if err := s.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount_cents), 0) FROM transactions
		 WHERE user_id = ? AND status IN ('completed', 'pending')`, userID).Scan(&available); err != nil {
		return nil, err
	}
	if err := s.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(escrow_cents), 0) FROM deals
		 WHERE (client_user_id = ? OR freelancer_user_id = ?) AND status IN ('active', 'review', 'negotiating')`,
		userID, userID).Scan(&inEscrow); err != nil {
		return nil, err
	}
	if err := s.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(m.amount_cents), 0)
		FROM milestones m JOIN deals d ON d.id = m.deal_id
		WHERE d.freelancer_user_id = ? AND m.status = 'submitted'`, userID).Scan(&pending); err != nil {
		return nil, err
	}
	wallet.Available = Money(available)
	wallet.InEscrow = Money(inEscrow)
	wallet.Pending = Money(pending)

	transactions, err := s.ListTransactions(ctx, userID, 100)
	if err != nil {
		return nil, err
	}
	wallet.Transactions = transactions
	return wallet, nil
}

type WithdrawInput struct {
	Amount     Money
	Rail       string
	ExternalID string
}

func (s *Store) Withdraw(ctx context.Context, userID string, input WithdrawInput) (*Wallet, error) {
	if input.Amount <= 0 {
		return nil, errors.New("withdrawal amount must be greater than zero")
	}
	wallet, err := s.WalletFor(ctx, userID)
	if err != nil {
		return nil, err
	}
	if input.Amount > wallet.Available {
		return nil, fmt.Errorf("available balance is %s", usd(wallet.Available))
	}
	if input.Rail == "" {
		input.Rail = "PayPal"
	}
	externalID := strings.TrimSpace(input.ExternalID)
	if externalID == "" {
		externalID = newID("PAYOUT-")
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, type, amount_cents, status, rail, description, counterparty, external_id, date_text, created_at)
		VALUES (?, ?, 'withdrawal', ?, 'completed', ?, 'Withdrawal to PayPal', 'PayPal', ?, '', ?)`,
		newID("TX-"), userID, -int(input.Amount), input.Rail, externalID, now(),
	)
	if err != nil {
		return nil, err
	}
	if err := s.InsertActivity(ctx, "Ledger", "processed a payout", fmt.Sprintf("%s via %s", usd(input.Amount), input.Rail)); err != nil {
		return nil, err
	}
	return s.WalletFor(ctx, userID)
}

func insertTransactionTx(ctx context.Context, tx *sql.Tx, userID, dealID, kind string, amount Money, status, rail, description, counterparty, externalID string) error {
	var deal any
	if dealID != "" {
		deal = dealID
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO transactions (
			id, user_id, deal_id, type, amount_cents, status, rail, description, counterparty, external_id, date_text, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`,
		newID("TX-"), userID, deal, kind, int(amount), status, rail, description, counterparty, externalID, now(),
	)
	return err
}
