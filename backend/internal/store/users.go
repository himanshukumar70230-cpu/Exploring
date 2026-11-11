package store

import (
	"context"
	"database/sql"
	"errors"
)

const userColumns = `id, clerk_user_id, email, name, avatar_url, role, created_at, updated_at`

func scanUser(scanner interface{ Scan(...any) error }) (*User, error) {
	var user User
	if err := scanner.Scan(&user.ID, &user.ClerkUserID, &user.Email, &user.Name, &user.AvatarURL, &user.Role, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (s *Store) UserByID(ctx context.Context, id string) (*User, error) {
	return scanUser(s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE id = ?`, id))
}

func (s *Store) UserByClerkID(ctx context.Context, clerkID string) (*User, error) {
	return scanUser(s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE clerk_user_id = ?`, clerkID))
}

func (s *Store) UpsertUser(ctx context.Context, clerkID, email, name, avatarURL, role string) (*User, error) {
	if clerkID == "" {
		return nil, errors.New("clerk user id is required")
	}
	if role == "" {
		role = "both"
	}
	ts := now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO users (id, clerk_user_id, email, name, avatar_url, role, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(clerk_user_id) DO UPDATE SET
			email = CASE WHEN excluded.email <> '' THEN excluded.email ELSE users.email END,
			name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE users.name END,
			avatar_url = CASE WHEN excluded.avatar_url <> '' THEN excluded.avatar_url ELSE users.avatar_url END,
			updated_at = excluded.updated_at`,
		newID("USR-"), clerkID, email, name, avatarURL, role, ts, ts,
	)
	if err != nil {
		return nil, err
	}
	return s.UserByClerkID(ctx, clerkID)
}

func (s *Store) UpdateUser(ctx context.Context, id, name, role string) (*User, error) {
	_, err := s.db.ExecContext(ctx, `
		UPDATE users SET
			name = CASE WHEN ? <> '' THEN ? ELSE name END,
			role = CASE WHEN ? <> '' THEN ? ELSE role END,
			updated_at = ?
		WHERE id = ?`,
		name, name, role, role, now(), id,
	)
	if err != nil {
		return nil, err
	}
	return s.UserByID(ctx, id)
}
