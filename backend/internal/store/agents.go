package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

const agentColumns = `id, owner_user_id, name, owner, role, initials, status, reputation, deals_count, success_rate, hourly_rate_cents, rate, location, skills, bio, persona, created_at, updated_at`

func scanAgent(scanner interface{ Scan(...any) error }) (*Agent, error) {
	var agent Agent
	var skills string
	var hourlyRate int
	if err := scanner.Scan(
		&agent.ID, &agent.OwnerUserID, &agent.Name, &agent.Owner, &agent.Role, &agent.Initials,
		&agent.Status, &agent.Reputation, &agent.Deals, &agent.SuccessRate, &hourlyRate,
		&agent.Rate, &agent.Location, &skills, &agent.Bio, &agent.Persona, &agent.CreatedAt, &agent.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	agent.Skills = unmarshalStrings(skills)
	agent.HourlyRate = Money(hourlyRate)
	return &agent, nil
}

func (s *Store) ListAgents(ctx context.Context, ownerID string) ([]Agent, error) {
	query := `SELECT ` + agentColumns + ` FROM agents`
	args := []any{}
	if ownerID != "" {
		query += ` WHERE owner_user_id = ?`
		args = append(args, ownerID)
	}
	query += ` ORDER BY deals_count DESC, name ASC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	agents := []Agent{}
	for rows.Next() {
		agent, err := scanAgent(rows)
		if err != nil {
			return nil, err
		}
		agents = append(agents, *agent)
	}
	return agents, rows.Err()
}

func (s *Store) GetAgent(ctx context.Context, id string) (*Agent, error) {
	return scanAgent(s.db.QueryRowContext(ctx, `SELECT `+agentColumns+` FROM agents WHERE id = ?`, id))
}

type CreateAgentInput struct {
	Name       string
	Role       string
	Initials   string
	Location   string
	Bio        string
	Skills     []string
	HourlyRate int
	Status     string
	Persona    string
}

func (s *Store) CreateAgent(ctx context.Context, owner User, input CreateAgentInput) (*Agent, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("agent name is required")
	}
	if input.Status == "" {
		input.Status = "online"
	}
	if input.Initials == "" {
		initials := []rune(strings.ToUpper(strings.ReplaceAll(input.Name, " ", "")))
		if len(initials) > 2 {
			initials = initials[:2]
		}
		input.Initials = string(initials)
	}
	id := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Name), " ", "-")) + "-" + newID("")[:4]
	id = strings.ToLower(id)
	rate := ""
	if input.HourlyRate > 0 {
		rate = fmt.Sprintf("$%d/hr", input.HourlyRate/100)
	}
	ts := now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO agents (
			id, owner_user_id, name, owner, role, initials, status, reputation, deals_count,
			success_rate, hourly_rate_cents, rate, location, skills, bio, persona, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 0, 100, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, owner.ID, strings.TrimSpace(input.Name), owner.Name, input.Role, strings.ToUpper(input.Initials),
		input.Status, input.HourlyRate, rate, input.Location, marshal(input.Skills), input.Bio, input.Persona, ts, ts,
	)
	if err != nil {
		return nil, err
	}
	return s.GetAgent(ctx, id)
}

func (s *Store) UpdateAgentStatus(ctx context.Context, ownerID, agentID, status string) (*Agent, error) {
	if status != "online" && status != "paused" && status != "negotiating" && status != "delivering" {
		return nil, errors.New("invalid agent status")
	}
	result, err := s.db.ExecContext(ctx, `UPDATE agents SET status = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?`, status, now(), agentID, ownerID)
	if err != nil {
		return nil, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return nil, ErrNotFound
	}
	return s.GetAgent(ctx, agentID)
}

func (s *Store) UpdateAgent(ctx context.Context, ownerID, agentID string, input CreateAgentInput) (*Agent, error) {
	_, err := s.db.ExecContext(ctx, `
		UPDATE agents SET
			name = CASE WHEN ? <> '' THEN ? ELSE name END,
			role = CASE WHEN ? <> '' THEN ? ELSE role END,
			location = CASE WHEN ? <> '' THEN ? ELSE location END,
			bio = CASE WHEN ? <> '' THEN ? ELSE bio END,
			skills = CASE WHEN ? <> '[]' THEN ? ELSE skills END,
			status = CASE WHEN ? <> '' THEN ? ELSE status END,
			updated_at = ?
		WHERE id = ? AND owner_user_id = ?`,
		input.Name, input.Name, input.Role, input.Role, input.Location, input.Location,
		input.Bio, input.Bio, marshal(input.Skills), marshal(input.Skills), input.Status, input.Status, now(),
		agentID, ownerID,
	)
	if err != nil {
		return nil, err
	}
	return s.GetAgent(ctx, agentID)
}

func (s *Store) SetAgentRate(ctx context.Context, ownerID, agentID string, hourlyCents int) (*Agent, error) {
	if hourlyCents < 0 {
		return nil, errors.New("hourly rate cannot be negative")
	}
	rate := ""
	if hourlyCents > 0 {
		rate = fmt.Sprintf("$%d/hr", hourlyCents/100)
	}
	result, err := s.db.ExecContext(ctx,
		`UPDATE agents SET hourly_rate_cents = ?, rate = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?`,
		hourlyCents, rate, now(), agentID, ownerID)
	if err != nil {
		return nil, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return nil, ErrNotFound
	}
	return s.GetAgent(ctx, agentID)
}
