package store

import (
	"context"
	"database/sql"
)

func (s *Store) ListActivity(ctx context.Context, limit int) ([]Activity, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT actor, action, meta, COALESCE(user_id, ''), created_at FROM activity ORDER BY created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Activity{}
	for rows.Next() {
		var item Activity
		if err := rows.Scan(&item.Actor, &item.Action, &item.Meta, &item.UserID, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.Time = humanTime(item.CreatedAt)
		items = append(items, item)
	}
	return items, rows.Err()
}

// ActivityAfter powers the SSE stream. It only returns events inserted after the
// supplied RFC3339 timestamp.
func (s *Store) ActivityAfter(ctx context.Context, after string, limit int) ([]Activity, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT actor, action, meta, COALESCE(user_id, ''), created_at
		 FROM activity WHERE created_at > ? ORDER BY created_at ASC LIMIT ?`, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Activity{}
	for rows.Next() {
		var item Activity
		if err := rows.Scan(&item.Actor, &item.Action, &item.Meta, &item.UserID, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.Time = humanTime(item.CreatedAt)
		items = append(items, item)
	}
	return items, rows.Err()
}

func insertActivityTx(ctx context.Context, tx *sql.Tx, actor, action, meta string) error {
	_, err := tx.ExecContext(ctx,
		`INSERT INTO activity (id, actor, action, meta, created_at) VALUES (?, ?, ?, ?, ?)`,
		newID("ACT-"), actor, action, meta, now())
	return err
}

func (s *Store) InsertActivity(ctx context.Context, actor, action, meta string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO activity (id, actor, action, meta, created_at) VALUES (?, ?, ?, ?, ?)`,
		newID("ACT-"), actor, action, meta, now())
	return err
}
