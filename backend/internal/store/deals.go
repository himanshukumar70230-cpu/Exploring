package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

const dealColumns = `d.id, d.job_id, j.title, j.client, u.name, COALESCE(ca.name, ''), COALESCE(ta.name, ''),
	d.amount_cents, d.status, d.progress, d.escrow_cents, d.next_milestone, d.due, d.timeline,
	d.client_user_id, d.freelancer_user_id, COALESCE(d.client_agent_id, ''), COALESCE(d.talent_agent_id, ''),
	d.created_at, d.updated_at`

func scanDeal(scanner interface{ Scan(...any) error }) (*Deal, error) {
	var deal Deal
	var amount, escrow int
	var timeline string
	if err := scanner.Scan(
		&deal.ID, &deal.JobID, &deal.Title, &deal.Client, &deal.Freelancer, &deal.ClientAgent, &deal.TalentAgent,
		&amount, &deal.Status, &deal.Progress, &escrow, &deal.NextMilestone, &deal.Due, &timeline,
		&deal.ClientUserID, &deal.FreelancerUserID, &deal.ClientAgentID, &deal.TalentAgentID,
		&deal.CreatedAt, &deal.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	deal.Amount = Money(amount)
	deal.Escrow = Money(escrow)
	deal.Timeline = unmarshalEvents(timeline)
	deal.Milestones = []Milestone{}
	deal.Negotiation = []NegotiationTurn{}
	return &deal, nil
}

func (s *Store) ListDeals(ctx context.Context, userID string) ([]Deal, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT `+dealColumns+`
		FROM deals d
		JOIN jobs j ON j.id = d.job_id
		JOIN users u ON u.id = d.freelancer_user_id
		LEFT JOIN agents ca ON ca.id = d.client_agent_id
		LEFT JOIN agents ta ON ta.id = d.talent_agent_id
		WHERE d.client_user_id = ? OR d.freelancer_user_id = ?
		ORDER BY d.updated_at DESC`, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	deals := []Deal{}
	for rows.Next() {
		deal, err := scanDeal(rows)
		if err != nil {
			return nil, err
		}
		deals = append(deals, *deal)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for index := range deals {
		if err := s.hydrateDeal(ctx, &deals[index]); err != nil {
			return nil, err
		}
	}
	return deals, nil
}

func (s *Store) GetDeal(ctx context.Context, id string) (*Deal, error) {
	deal, err := scanDeal(s.db.QueryRowContext(ctx, `
		SELECT `+dealColumns+`
		FROM deals d
		JOIN jobs j ON j.id = d.job_id
		JOIN users u ON u.id = d.freelancer_user_id
		LEFT JOIN agents ca ON ca.id = d.client_agent_id
		LEFT JOIN agents ta ON ta.id = d.talent_agent_id
		WHERE d.id = ?`, id))
	if err != nil {
		return nil, err
	}
	if err := s.hydrateDeal(ctx, deal); err != nil {
		return nil, err
	}
	return deal, nil
}

func (s *Store) GetDealForUser(ctx context.Context, id, userID string) (*Deal, error) {
	deal, err := s.GetDeal(ctx, id)
	if err != nil {
		return nil, err
	}
	if deal.ClientUserID != userID && deal.FreelancerUserID != userID {
		return nil, ErrNotFound
	}
	return deal, nil
}

func (s *Store) hydrateDeal(ctx context.Context, deal *Deal) error {
	milestones, err := s.ListMilestones(ctx, deal.ID)
	if err != nil {
		return err
	}
	deal.Milestones = milestones
	turns, err := s.ListDealNegotiation(ctx, deal.ID)
	if err != nil {
		return err
	}
	deal.Negotiation = turns
	return nil
}

func (s *Store) ListMilestones(ctx context.Context, dealID string) ([]Milestone, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, position, title, amount_cents, due_text, status FROM milestones
		 WHERE deal_id = ? ORDER BY position ASC`, dealID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Milestone{}
	for rows.Next() {
		var item Milestone
		var amount int
		if err := rows.Scan(&item.ID, &item.Position, &item.Title, &amount, &item.Due, &item.Status); err != nil {
			return nil, err
		}
		item.Amount = Money(amount)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) ListDealNegotiation(ctx context.Context, dealID string) ([]NegotiationTurn, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, agent_id, from_name, side, message, amount_cents, created_at
		FROM negotiation_turns WHERE deal_id = ? ORDER BY created_at ASC`, dealID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	turns := []NegotiationTurn{}
	for rows.Next() {
		var turn NegotiationTurn
		var agentID sql.NullString
		var amount sql.NullInt64
		if err := rows.Scan(&turn.ID, &agentID, &turn.From, &turn.Side, &turn.Message, &amount, &turn.CreatedAt); err != nil {
			return nil, err
		}
		if agentID.Valid {
			turn.AgentID = agentID.String
		}
		if amount.Valid {
			turn.Amount = Money(amount.Int64)
		}
		turn.Time = humanTime(turn.CreatedAt)
		turns = append(turns, turn)
	}
	return turns, rows.Err()
}

// FundEscrow moves client money into the deal's escrow balance and writes a
// ledger entry. Rail is "Bidline escrow" for wallet funds or "PayPal" for an
// externally captured order.
func (s *Store) FundEscrow(ctx context.Context, dealID, userID string, amount Money, rail string) (*Deal, error) {
	deal, err := s.GetDealForUser(ctx, dealID, userID)
	if err != nil {
		return nil, err
	}
	if deal.ClientUserID != userID {
		return nil, errors.New("only the client can fund escrow")
	}
	if deal.Status == "completed" || deal.Status == "settled" || deal.Status == "cancelled" {
		return nil, errors.New("this deal is closed")
	}
	if amount <= 0 {
		return nil, errors.New("escrow amount must be greater than zero")
	}
	remaining := deal.Amount - deal.Escrow
	if amount > remaining {
		return nil, fmt.Errorf("you can fund at most %s more", usd(remaining))
	}
	if rail == "" {
		rail = "Bidline escrow"
	}
	if !strings.EqualFold(rail, "PayPal") {
		wallet, walletErr := s.WalletFor(ctx, userID)
		if walletErr != nil {
			return nil, walletErr
		}
		if amount > wallet.Available {
			return nil, fmt.Errorf("available balance is %s; fund the escrow from PayPal or add funds", usd(wallet.Available))
		}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	escrow := deal.Escrow + amount
	status := deal.Status
	if status == "negotiating" {
		status = "active"
	}
	timeline := appendEvent(deal.Timeline, TimelineEvent{
		Time: "Just now", Title: "Escrow funded",
		Detail: fmt.Sprintf("%s added to escrow via %s", usd(amount), rail), Kind: "payment",
	})
	if _, err := tx.ExecContext(ctx,
		`UPDATE deals SET escrow_cents = ?, status = ?, timeline = ?, updated_at = ? WHERE id = ?`,
		int(escrow), status, marshal(timeline), now(), deal.ID); err != nil {
		return nil, err
	}

	// PayPal funds never pass through the wallet, so record an offsetting deposit
	// and hold; wallet-funded escrow is a single debit.
	if strings.EqualFold(rail, "PayPal") {
		if err := insertTransactionTx(ctx, tx, userID, deal.ID, "deposit", amount, "completed", "PayPal", "PayPal funding · "+deal.Title, "PayPal", ""); err != nil {
			return nil, err
		}
	}
	if err := insertTransactionTx(ctx, tx, userID, deal.ID, "escrow", -amount, "completed", rail,
		"Escrow hold · "+deal.Title, deal.Freelancer, ""); err != nil {
		return nil, err
	}
	if err := insertActivityTx(ctx, tx, deal.ClientAgent, "funded escrow", fmt.Sprintf("%s · %s", usd(amount), deal.Title)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetDeal(ctx, deal.ID)
}

func (s *Store) SubmitMilestone(ctx context.Context, dealID, milestoneID, userID string) (*Deal, error) {
	deal, err := s.GetDealForUser(ctx, dealID, userID)
	if err != nil {
		return nil, err
	}
	if deal.FreelancerUserID != userID {
		return nil, errors.New("only the freelancer can submit a milestone")
	}
	milestone, err := s.GetMilestone(ctx, dealID, milestoneID)
	if err != nil {
		return nil, err
	}
	if milestone.Status != "pending" && milestone.Status != "rejected" {
		return nil, errors.New("this milestone is not open for submission")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`UPDATE milestones SET status = 'submitted' WHERE id = ? AND deal_id = ?`, milestoneID, dealID); err != nil {
		return nil, err
	}
	timeline := appendEvent(deal.Timeline, TimelineEvent{
		Time: "Just now", Title: "Milestone submitted",
		Detail: fmt.Sprintf("%s submitted %q for review", deal.TalentAgent, milestone.Title), Kind: "milestone",
	})
	next := "Awaiting review · " + milestone.Title
	if _, err := tx.ExecContext(ctx,
		`UPDATE deals SET timeline = ?, next_milestone = ?, status = 'review', updated_at = ? WHERE id = ?`,
		marshal(timeline), next, now(), deal.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE jobs SET status = 'delivered', updated_at = ? WHERE id = ?`, now(), deal.JobID); err != nil {
		return nil, err
	}
	if err := insertActivityTx(ctx, tx, deal.TalentAgent, "submitted a milestone", fmt.Sprintf("%s · %s", milestone.Title, deal.Title)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetDeal(ctx, deal.ID)
}

func (s *Store) AcceptMilestone(ctx context.Context, dealID, milestoneID, userID string, feeBPS int) (*Deal, error) {
	deal, err := s.GetDealForUser(ctx, dealID, userID)
	if err != nil {
		return nil, err
	}
	if deal.ClientUserID != userID {
		return nil, errors.New("only the client can accept a milestone")
	}
	milestone, err := s.GetMilestone(ctx, dealID, milestoneID)
	if err != nil {
		return nil, err
	}
	if milestone.Status != "submitted" {
		return nil, errors.New("this milestone is not awaiting review")
	}
	if deal.Escrow < milestone.Amount {
		return nil, errors.New("fund escrow before releasing this milestone")
	}

	fee := milestone.Amount * Money(feeBPS) / 10000
	net := milestone.Amount - fee

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`UPDATE milestones SET status = 'released' WHERE id = ? AND deal_id = ?`, milestoneID, dealID); err != nil {
		return nil, err
	}

	escrow := deal.Escrow - milestone.Amount
	progress := deal.progressAfterRelease(milestone.Amount)
	status := "active"
	next := nextOpenMilestone(deal, milestoneID)
	if progress >= 100 {
		status = "settled"
		next = "Complete"
	}
	timeline := appendEvent(deal.Timeline, TimelineEvent{
		Time: "Just now", Title: "Milestone released",
		Detail: fmt.Sprintf("%s released to %s", usd(net), deal.Freelancer), Kind: "payment",
	})
	if _, err := tx.ExecContext(ctx,
		`UPDATE deals SET escrow_cents = ?, progress = ?, next_milestone = ?, status = ?, timeline = ?, updated_at = ? WHERE id = ?`,
		int(escrow), progress, next, status, marshal(timeline), now(), deal.ID); err != nil {
		return nil, err
	}
	// Credit the gross release and record the fee separately so the ledger and
	// the available balance agree with the seeded convention (release minus fee).
	if err := insertTransactionTx(ctx, tx, deal.FreelancerUserID, deal.ID, "release", milestone.Amount, "completed",
		"Bidline escrow", "Milestone release · "+milestone.Title, deal.Client, ""); err != nil {
		return nil, err
	}
	if fee > 0 {
		if err := insertTransactionTx(ctx, tx, deal.FreelancerUserID, deal.ID, "fee", -fee, "completed",
			"Internal", fmt.Sprintf("Platform fee · %.1f%%", float64(feeBPS)/100), "Bidline", ""); err != nil {
			return nil, err
		}
	}
	if status == "settled" {
		if _, err := tx.ExecContext(ctx,
			`UPDATE jobs SET status = 'settled', updated_at = ? WHERE id = ?`, now(), deal.JobID); err != nil {
			return nil, err
		}
		if _, err := tx.ExecContext(ctx,
			`UPDATE agents SET status = 'online', updated_at = ? WHERE id = ?`, now(), deal.TalentAgentID); err != nil {
			return nil, err
		}
	}
	if err := insertActivityTx(ctx, tx, "Bidline escrow", "released a milestone",
		fmt.Sprintf("%s to %s · %s", usd(net), deal.Freelancer, milestone.Title)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetDeal(ctx, deal.ID)
}

func (s *Store) RejectMilestone(ctx context.Context, dealID, milestoneID, userID, reason string) (*Deal, error) {
	deal, err := s.GetDealForUser(ctx, dealID, userID)
	if err != nil {
		return nil, err
	}
	if deal.ClientUserID != userID {
		return nil, errors.New("only the client can request changes")
	}
	milestone, err := s.GetMilestone(ctx, dealID, milestoneID)
	if err != nil {
		return nil, err
	}
	if milestone.Status != "submitted" {
		return nil, errors.New("this milestone is not awaiting review")
	}
	if strings.TrimSpace(reason) == "" {
		reason = "Changes requested before release"
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`UPDATE milestones SET status = 'rejected' WHERE id = ? AND deal_id = ?`, milestoneID, dealID); err != nil {
		return nil, err
	}
	timeline := appendEvent(deal.Timeline, TimelineEvent{
		Time: "Just now", Title: "Changes requested",
		Detail: fmt.Sprintf("%s asked for changes on %q", deal.ClientAgent, milestone.Title), Kind: "system",
	})
	if _, err := tx.ExecContext(ctx,
		`UPDATE deals SET timeline = ?, next_milestone = ?, status = 'active', updated_at = ? WHERE id = ?`,
		marshal(timeline), "Rework · "+milestone.Title, now(), deal.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO negotiation_turns (id, deal_id, from_name, side, message, created_at)
		VALUES (?, ?, ?, 'client', ?, ?)`,
		newID("TURN-"), deal.ID, deal.ClientAgent, reason, now()); err != nil {
		return nil, err
	}
	if err := insertActivityTx(ctx, tx, deal.ClientAgent, "requested changes", milestone.Title+" · "+deal.Title); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetDeal(ctx, deal.ID)
}

func (s *Store) AddDealTurn(ctx context.Context, dealID, userID, message string, amount Money) (*Deal, error) {
	deal, err := s.GetDealForUser(ctx, dealID, userID)
	if err != nil {
		return nil, err
	}
	message = strings.TrimSpace(message)
	if message == "" {
		return nil, errors.New("message is required")
	}

	side, from := "client", deal.ClientAgent
	if deal.FreelancerUserID == userID {
		side, from = "talent", deal.TalentAgent
	}
	var amountValue any
	if amount > 0 {
		amountValue = int(amount)
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO negotiation_turns (id, deal_id, from_name, side, message, amount_cents, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		newID("TURN-"), deal.ID, from, side, message, amountValue, now()); err != nil {
		return nil, err
	}
	timeline := appendEvent(deal.Timeline, TimelineEvent{
		Time: "Just now", Title: "New message", Detail: from + ": " + message, Kind: "message",
	})
	if _, err := tx.ExecContext(ctx,
		`UPDATE deals SET timeline = ?, updated_at = ? WHERE id = ?`, marshal(timeline), now(), deal.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetDeal(ctx, deal.ID)
}

func (s *Store) GetMilestone(ctx context.Context, dealID, milestoneID string) (*Milestone, error) {
	var item Milestone
	var amount int
	err := s.db.QueryRowContext(ctx,
		`SELECT id, position, title, amount_cents, due_text, status FROM milestones WHERE deal_id = ? AND id = ?`,
		dealID, milestoneID).Scan(&item.ID, &item.Position, &item.Title, &amount, &item.Due, &item.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	item.Amount = Money(amount)
	return &item, nil
}

func (deal *Deal) progressAfterRelease(justReleased Money) int {
	if deal.Amount <= 0 {
		return 100
	}
	released := justReleased
	for _, milestone := range deal.Milestones {
		if milestone.Status == "released" {
			released += milestone.Amount
		}
	}
	progress := int(released * 100 / deal.Amount)
	if progress > 100 {
		progress = 100
	}
	return progress
}

func nextOpenMilestone(deal *Deal, skipID string) string {
	for _, milestone := range deal.Milestones {
		if milestone.ID == skipID {
			continue
		}
		if milestone.Status != "released" {
			return milestone.Title
		}
	}
	return "Complete"
}

func appendEvent(events []TimelineEvent, event TimelineEvent) []TimelineEvent {
	events = append(events, event)
	if len(events) > 40 {
		events = events[len(events)-40:]
	}
	return events
}
