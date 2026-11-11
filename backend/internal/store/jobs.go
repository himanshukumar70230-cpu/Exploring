package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

const jobColumns = `id, slug, owner_user_id, client_agent_id, title, category, description, client, client_handle,
	client_agent, company, budget_min_cents, budget_max_cents, currency, deadline, status, priority,
	bids_count, skills, scope, milestones, created_at, updated_at`

type JobFilter struct {
	Category string
	Status   string
	Query    string
	Sort     string
	OwnerID  string
}

func scanJob(scanner interface{ Scan(...any) error }) (*Job, error) {
	var job Job
	var clientAgentID sql.NullString
	var skills, scope, milestones string
	var budgetMin, budgetMax int
	if err := scanner.Scan(
		&job.ID, &job.Slug, &job.OwnerUserID, &clientAgentID, &job.Title, &job.Category, &job.Description,
		&job.Client, &job.ClientHandle, &job.ClientAgent, &job.Company, &budgetMin, &budgetMax,
		&job.Currency, &job.Deadline, &job.Status, &job.Priority, &job.BidsCount, &skills, &scope, &milestones,
		&job.CreatedAt, &job.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	job.BudgetMin = Money(budgetMin)
	job.BudgetMax = Money(budgetMax)
	if clientAgentID.Valid {
		job.ClientAgentID = clientAgentID.String
	}
	job.Skills = unmarshalStrings(skills)
	job.Scope = unmarshalStrings(scope)
	job.Milestones = unmarshalMilestones(milestones)
	job.Posted = humanTime(job.CreatedAt)
	job.Bids = []Bid{}
	job.Negotiation = []NegotiationTurn{}
	return &job, nil
}

func (s *Store) ListJobs(ctx context.Context, filter JobFilter) ([]Job, error) {
	query := `SELECT ` + jobColumns + ` FROM jobs WHERE 1=1`
	args := []any{}

	if filter.Category != "" && filter.Category != "All" {
		query += ` AND category = ?`
		args = append(args, filter.Category)
	}
	if filter.Status != "" && filter.Status != "all" {
		query += ` AND status = ?`
		args = append(args, filter.Status)
	}
	if filter.Query != "" {
		like := "%" + strings.ToLower(filter.Query) + "%"
		query += ` AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(client) LIKE ? OR LOWER(skills) LIKE ?)`
		args = append(args, like, like, like, like)
	}
	if filter.OwnerID != "" {
		query += ` AND owner_user_id = ?`
		args = append(args, filter.OwnerID)
	}
	switch filter.Sort {
	case "budget":
		query += ` ORDER BY budget_max_cents DESC`
	case "bids":
		query += ` ORDER BY bids_count DESC`
	default:
		query += ` ORDER BY created_at DESC`
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := []Job{}
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, *job)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for index := range jobs {
		if err := s.hydrateJob(ctx, &jobs[index]); err != nil {
			return nil, err
		}
	}
	return jobs, nil
}

func (s *Store) GetJob(ctx context.Context, idOrSlug string) (*Job, error) {
	job, err := scanJob(s.db.QueryRowContext(ctx,
		`SELECT `+jobColumns+` FROM jobs WHERE id = ? OR slug = ?`, idOrSlug, idOrSlug))
	if err != nil {
		return nil, err
	}
	if err := s.hydrateJob(ctx, job); err != nil {
		return nil, err
	}
	return job, nil
}

func (s *Store) hydrateJob(ctx context.Context, job *Job) error {
	bids, err := s.ListBids(ctx, job.ID)
	if err != nil {
		return err
	}
	turns, err := s.ListNegotiation(ctx, job.ID)
	if err != nil {
		return err
	}
	job.Bids = bids
	job.Negotiation = turns
	if job.BidsCount < len(bids) {
		job.BidsCount = len(bids)
	}
	return nil
}

type CreateJobInput struct {
	Title       string
	Category    string
	Description string
	Company     string
	BudgetMin   int
	BudgetMax   int
	Currency    string
	Deadline    string
	Priority    string
	Skills      []string
	Scope       []string
	Milestones  []Milestone
}

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(value string) string {
	slug := strings.ToLower(strings.TrimSpace(value))
	slug = slugPattern.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "brief"
	}
	if len(slug) > 70 {
		slug = slug[:70]
	}
	return slug
}

func (s *Store) CreateJob(ctx context.Context, owner User, input CreateJobInput) (*Job, error) {
	if strings.TrimSpace(input.Title) == "" {
		return nil, errors.New("title is required")
	}
	if strings.TrimSpace(input.Description) == "" {
		return nil, errors.New("description is required")
	}
	if input.BudgetMin <= 0 || input.BudgetMax < input.BudgetMin {
		return nil, errors.New("invalid budget range")
	}
	if input.Currency == "" {
		input.Currency = "USD"
	}
	if input.Priority == "" {
		input.Priority = "Best value"
	}
	if input.Deadline == "" {
		input.Deadline = "Flexible"
	}

	midpoint := Money((input.BudgetMin + input.BudgetMax) / 2)
	milestones := input.Milestones
	if len(milestones) == 0 {
		milestones = defaultMilestones(midpoint)
	}

	clientAgent, err := s.ensureClientAgent(ctx, owner)
	if err != nil {
		return nil, err
	}

	slug := slugify(input.Title)
	for suffix := 1; ; suffix++ {
		var exists int
		err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM jobs WHERE slug = ?`, slug).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if exists == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", slug, suffix)
	}

	clientName := strings.TrimSpace(input.Company)
	if clientName == "" {
		clientName = owner.Name
	}

	ts := now()
	id := slug
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO jobs (
			id, slug, owner_user_id, client_agent_id, title, category, description, client, client_handle,
			client_agent, company, budget_min_cents, budget_max_cents, currency, deadline, status, priority,
			bids_count, skills, scope, milestones, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 0, ?, ?, ?, ?, ?)`,
		id, slug, owner.ID, clientAgent.ID, input.Title, input.Category, input.Description,
		clientName, slugify(clientName), clientAgent.Name, input.Company,
		int(Money(input.BudgetMin)), int(Money(input.BudgetMax)), input.Currency, input.Deadline, input.Priority,
		marshal(input.Skills), marshal(input.Scope), marshal(milestones), ts, ts,
	)
	if err != nil {
		return nil, err
	}
	return s.GetJob(ctx, id)
}

// EnsureProcurementAgent returns the account's procurement agent, creating the
// default one when the fleet is empty. The API calls this on first load so new
// accounts are never greeted by an empty roster.
func (s *Store) EnsureProcurementAgent(ctx context.Context, owner User) (*Agent, error) {
	return s.ensureClientAgent(ctx, owner)
}

func (s *Store) ensureClientAgent(ctx context.Context, owner User) (*Agent, error) {
	agents, err := s.ListAgents(ctx, owner.ID)
	if err != nil {
		return nil, err
	}
	for _, agent := range agents {
		if strings.Contains(strings.ToLower(agent.Role), "procurement") || strings.Contains(strings.ToLower(agent.Role), "client") {
			return &agent, nil
		}
	}
	return s.CreateAgent(ctx, owner, CreateAgentInput{
		Name:     "Procurement-01",
		Role:     "Client procurement agent",
		Initials: "P1",
		Location: "Remote",
		Bio:      "Packages briefs, invites matched agents, runs the bidding round, and asks a human before funds move.",
		Skills:   []string{"Scoping", "Negotiation", "Acceptance"},
		Persona:  "You are a calm procurement agent. You protect the client's budget and insist on measurable acceptance criteria.",
	})
}

func defaultMilestones(total Money) []Milestone {
	first := total * 25 / 100
	second := total * 50 / 100
	return []Milestone{
		{Title: "Kickoff & discovery", Amount: first, Due: "Within 4 days", Status: "pending", Position: 1},
		{Title: "Core delivery", Amount: second, Due: "Within 14 days", Status: "pending", Position: 2},
		{Title: "Final handoff & acceptance", Amount: total - first - second, Due: "Within 21 days", Status: "pending", Position: 3},
	}
}

// scaleMilestones keeps the planned tranche proportions while fitting the
// awarded offer. Without this a bid below the brief's midpoint would leave
// escrow short of the final milestone.
func scaleMilestones(milestones []Milestone, total Money) []Milestone {
	var planned Money
	for _, milestone := range milestones {
		planned += milestone.Amount
	}
	if planned <= 0 || planned == total {
		return milestones
	}

	scaled := make([]Milestone, len(milestones))
	copy(scaled, milestones)
	var allocated Money
	for index := range scaled {
		if index == len(scaled)-1 {
			scaled[index].Amount = total - allocated
			break
		}
		scaled[index].Amount = Money(int64(scaled[index].Amount) * int64(total) / int64(planned))
		allocated += scaled[index].Amount
	}
	return scaled
}

func (s *Store) UpdateJobStatus(ctx context.Context, jobID, status string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?`, status, now(), jobID)
	return err
}

// ── Bids ─────────────────────────────────────────────────────────────────────

const bidColumns = `b.id, b.agent_id, a.name, a.owner, b.amount_cents, b.days, b.fit_score,
	b.status, b.note, b.created_at, b.owner_user_id`

func scanBid(scanner interface{ Scan(...any) error }) (*Bid, error) {
	var bid Bid
	var amount int
	if err := scanner.Scan(
		&bid.ID, &bid.AgentID, &bid.Agent, &bid.Owner, &amount, &bid.Days,
		&bid.Score, &bid.Status, &bid.Note, &bid.CreatedAt, &bid.OwnerUserID,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	bid.Amount = Money(amount)
	bid.Submitted = humanTime(bid.CreatedAt)
	return &bid, nil
}

func (s *Store) ListBids(ctx context.Context, jobID string) ([]Bid, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT `+bidColumns+` FROM bids b JOIN agents a ON a.id = b.agent_id
		 WHERE b.job_id = ? ORDER BY b.fit_score DESC, b.created_at ASC`, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bids := []Bid{}
	for rows.Next() {
		bid, err := scanBid(rows)
		if err != nil {
			return nil, err
		}
		bids = append(bids, *bid)
	}
	return bids, rows.Err()
}

func (s *Store) GetBid(ctx context.Context, jobID, bidID string) (*Bid, error) {
	return scanBid(s.db.QueryRowContext(ctx,
		`SELECT `+bidColumns+` FROM bids b JOIN agents a ON a.id = b.agent_id
		 WHERE b.job_id = ? AND b.id = ?`, jobID, bidID))
}

type CreateBidInput struct {
	AgentID string
	Amount  int
	Days    int
	Score   int
	Note    string
}

func (s *Store) CreateBid(ctx context.Context, bidderUserID, jobID string, input CreateBidInput) (*Bid, error) {
	job, err := s.GetJob(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if job.Status != "open" && job.Status != "negotiating" {
		return nil, errors.New("bidding is closed for this brief")
	}
	agent, err := s.GetAgent(ctx, input.AgentID)
	if err != nil {
		return nil, err
	}
	if agent.OwnerUserID != bidderUserID {
		return nil, errors.New("you can only bid with your own agent")
	}
	if agent.Status == "paused" {
		return nil, errors.New("agent is paused")
	}
	if input.Amount < int(job.BudgetMin) || input.Amount > int(job.BudgetMax) {
		return nil, fmt.Errorf("offer must be between $%d and $%d", job.BudgetMin.Dollars(), job.BudgetMax.Dollars())
	}
	if input.Days <= 0 {
		input.Days = 14
	}
	if input.Score <= 0 {
		input.Score = 85
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`UPDATE bids SET status = 'shortlisted' WHERE job_id = ? AND status = 'leading'`, job.ID); err != nil {
		return nil, err
	}

	bidID := newID("BID-")
	ts := now()
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO bids (id, job_id, agent_id, owner_user_id, amount_cents, days, fit_score, status, note, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'leading', ?, ?)`,
		bidID, job.ID, agent.ID, bidderUserID, input.Amount, input.Days, input.Score, input.Note, ts,
	); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE jobs SET bids_count = bids_count + 1, status = 'negotiating', updated_at = ? WHERE id = ?`, ts, job.ID); err != nil {
		return nil, err
	}
	if err := insertActivityTx(ctx, tx, agent.Name, "submitted a bid", fmt.Sprintf("%s · %s over %d days", usd(Money(input.Amount)), job.Title, input.Days)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetBid(ctx, job.ID, bidID)
}

// ── Negotiation ──────────────────────────────────────────────────────────────

func (s *Store) ListNegotiation(ctx context.Context, jobID string) ([]NegotiationTurn, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, agent_id, from_name, side, message, amount_cents, created_at
		FROM negotiation_turns WHERE job_id = ? ORDER BY created_at ASC`, jobID)
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

type AddTurnInput struct {
	AgentID string
	From    string
	Side    string
	Message string
	Amount  Money
}

func (s *Store) AddNegotiationTurn(ctx context.Context, jobID string, input AddTurnInput) (*NegotiationTurn, error) {
	if strings.TrimSpace(input.Message) == "" {
		return nil, errors.New("message is required")
	}
	if input.Side != "client" && input.Side != "talent" && input.Side != "system" {
		input.Side = "talent"
	}
	turn := NegotiationTurn{
		ID: newID("TURN-"), AgentID: input.AgentID, From: input.From, Side: input.Side,
		Message: input.Message, Amount: input.Amount, CreatedAt: now(),
	}
	var amount any
	if input.Amount > 0 {
		amount = int(input.Amount)
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO negotiation_turns (id, job_id, agent_id, from_name, side, message, amount_cents, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		turn.ID, jobID, input.AgentID, input.From, input.Side, input.Message, amount, turn.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	turn.Time = humanTime(turn.CreatedAt)
	return &turn, nil
}

// ── Award ────────────────────────────────────────────────────────────────────

func (s *Store) AcceptBid(ctx context.Context, clientUserID, jobID, bidID string) (*Deal, error) {
	job, err := s.GetJob(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if job.OwnerUserID != clientUserID {
		return nil, errors.New("only the client who posted this brief can award it")
	}
	bid, err := s.GetBid(ctx, job.ID, bidID)
	if err != nil {
		return nil, err
	}
	if bid.Status == "accepted" {
		return nil, errors.New("this bid was already accepted")
	}
	talent, err := s.GetAgent(ctx, bid.AgentID)
	if err != nil {
		return nil, err
	}

	milestones := job.Milestones
	if len(milestones) == 0 {
		milestones = defaultMilestones(bid.Amount)
	} else {
		milestones = scaleMilestones(milestones, bid.Amount)
		for index := range milestones {
			milestones[index].Status = "pending"
			milestones[index].Position = index + 1
		}
	}

	dealID := newDealID()
	for {
		var exists int
		if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM deals WHERE id = ?`, dealID).Scan(&exists); err != nil {
			return nil, err
		}
		if exists == 0 {
			break
		}
		dealID = newDealID()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	ts := now()
	timeline := []TimelineEvent{
		{Time: "Just now", Title: "Deal opened", Detail: fmt.Sprintf("%s accepted %s's offer", job.ClientAgent, talent.Name), Kind: "system"},
	}
	nextMilestone := ""
	if len(milestones) > 0 {
		nextMilestone = milestones[0].Title
	}
	clientAgentID := any(job.ClientAgentID)
	if job.ClientAgentID == "" {
		clientAgentID = nil
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO deals (
			id, job_id, client_user_id, freelancer_user_id, client_agent_id, talent_agent_id,
			amount_cents, status, progress, escrow_cents, next_milestone, due, timeline, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 4, 0, ?, ?, ?, ?, ?)`,
		dealID, job.ID, clientUserID, talent.OwnerUserID, clientAgentID, talent.ID,
		int(bid.Amount), nextMilestone, job.Deadline, marshal(timeline), ts, ts,
	); err != nil {
		return nil, err
	}
	for index, milestone := range milestones {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO milestones (id, deal_id, position, title, amount_cents, due_text, status)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			newID("MS-"), dealID, index+1, milestone.Title, int(milestone.Amount), milestone.Due, "pending",
		); err != nil {
			return nil, err
		}
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE bids SET status = CASE WHEN id = ? THEN 'accepted' ELSE 'outbid' END WHERE job_id = ?`, bid.ID, job.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE jobs SET status = 'in-progress', updated_at = ? WHERE id = ?`, ts, job.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE agents SET deals_count = deals_count + 1, status = 'delivering', updated_at = ? WHERE id = ?`, ts, talent.ID); err != nil {
		return nil, err
	}
	if err := insertActivityTx(ctx, tx, talent.Name, "won a deal", fmt.Sprintf("%s · %s", usd(bid.Amount), job.Title)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetDeal(ctx, dealID)
}

func usd(cents Money) string {
	return fmt.Sprintf("$%d", cents.Dollars())
}
