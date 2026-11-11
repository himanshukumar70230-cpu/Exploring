package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	if path == "" {
		path = "./data/bidline.db"
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create database directory: %w", err)
	}

	dsn := path
	if !strings.HasPrefix(dsn, "file:") {
		dsn = "file:" + filepath.ToSlash(path)
	}
	if !strings.Contains(dsn, "?") {
		dsn += "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)"
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(time.Hour)

	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate database: %w", err)
	}

	store := &Store{db: db}
	if err := store.seed(); err != nil {
		db.Close()
		return nil, fmt.Errorf("seed database: %w", err)
	}
	return store, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }

func now() string { return time.Now().UTC().Format(time.RFC3339) }

func ago(t time.Time) string {
	diff := time.Since(t)
	switch {
	case diff < time.Minute:
		return "Just now"
	case diff < time.Hour:
		return fmt.Sprintf("%dm ago", int(diff.Minutes()))
	case diff < 24*time.Hour:
		return fmt.Sprintf("%dh ago", int(diff.Hours()))
	case diff < 48*time.Hour:
		return "Yesterday"
	default:
		return fmt.Sprintf("%dd ago", int(diff.Hours()/24))
	}
}

func humanTime(ts string) string {
	t, err := time.Parse(time.RFC3339, ts)
	if err != nil {
		return ts
	}
	return ago(t)
}

func newID(prefix string) string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s%d", prefix, time.Now().UnixNano())
	}
	return prefix + strings.ToUpper(hex.EncodeToString(buf))
}

func newDealID() string {
	buf := make([]byte, 2)
	if _, err := rand.Read(buf); err != nil {
		return "DL-0000"
	}
	return "DL-" + strings.ToUpper(hex.EncodeToString(buf))
}

func marshal(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func unmarshalStrings(value string) []string {
	var out []string
	if value == "" {
		return []string{}
	}
	if err := json.Unmarshal([]byte(value), &out); err != nil {
		return []string{}
	}
	return out
}

func unmarshalEvents(value string) []TimelineEvent {
	var out []TimelineEvent
	if value == "" {
		return []TimelineEvent{}
	}
	if err := json.Unmarshal([]byte(value), &out); err != nil {
		return []TimelineEvent{}
	}
	return out
}

func unmarshalMilestones(value string) []Milestone {
	var out []Milestone
	if value == "" {
		return []Milestone{}
	}
	if err := json.Unmarshal([]byte(value), &out); err != nil {
		return []Milestone{}
	}
	return out
}
