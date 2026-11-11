package store

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    clerk_user_id  TEXT NOT NULL UNIQUE,
    email          TEXT NOT NULL DEFAULT '',
    name           TEXT NOT NULL DEFAULT '',
    avatar_url     TEXT NOT NULL DEFAULT '',
    role           TEXT NOT NULL DEFAULT 'both',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
    id                TEXT PRIMARY KEY,
    owner_user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    owner             TEXT NOT NULL DEFAULT '',
    role              TEXT NOT NULL DEFAULT '',
    initials          TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'online',
    reputation        REAL NOT NULL DEFAULT 5.0,
    deals_count       INTEGER NOT NULL DEFAULT 0,
    success_rate      INTEGER NOT NULL DEFAULT 100,
    hourly_rate_cents INTEGER NOT NULL DEFAULT 0,
    rate              TEXT NOT NULL DEFAULT '',
    location          TEXT NOT NULL DEFAULT '',
    skills            TEXT NOT NULL DEFAULT '[]',
    bio               TEXT NOT NULL DEFAULT '',
    persona           TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_user_id);

CREATE TABLE IF NOT EXISTS jobs (
    id               TEXT PRIMARY KEY,
    slug             TEXT NOT NULL UNIQUE,
    owner_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_agent_id  TEXT REFERENCES agents(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    category         TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    client           TEXT NOT NULL DEFAULT '',
    client_handle    TEXT NOT NULL DEFAULT '',
    client_agent     TEXT NOT NULL DEFAULT '',
    company          TEXT NOT NULL DEFAULT '',
    budget_min_cents INTEGER NOT NULL DEFAULT 0,
    budget_max_cents INTEGER NOT NULL DEFAULT 0,
    currency         TEXT NOT NULL DEFAULT 'USD',
    deadline         TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'open',
    priority         TEXT NOT NULL DEFAULT 'Best value',
    bids_count       INTEGER NOT NULL DEFAULT 0,
    skills           TEXT NOT NULL DEFAULT '[]',
    scope            TEXT NOT NULL DEFAULT '[]',
    milestones       TEXT NOT NULL DEFAULT '[]',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_owner ON jobs(owner_user_id);

CREATE TABLE IF NOT EXISTS bids (
    id             TEXT PRIMARY KEY,
    job_id         TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    agent_id       TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    owner_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents   INTEGER NOT NULL,
    days           INTEGER NOT NULL DEFAULT 14,
    fit_score      INTEGER NOT NULL DEFAULT 80,
    status         TEXT NOT NULL DEFAULT 'leading',
    note           TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_agent ON bids(agent_id);

CREATE TABLE IF NOT EXISTS negotiation_turns (
    id           TEXT PRIMARY KEY,
    job_id       TEXT REFERENCES jobs(id) ON DELETE CASCADE,
    deal_id      TEXT,
    agent_id     TEXT,
    from_name    TEXT NOT NULL DEFAULT '',
    side         TEXT NOT NULL DEFAULT 'talent',
    message      TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER,
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_turns_job ON negotiation_turns(job_id);

CREATE TABLE IF NOT EXISTS deals (
    id                TEXT PRIMARY KEY,
    job_id            TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    client_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freelancer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_agent_id   TEXT,
    talent_agent_id   TEXT,
    amount_cents      INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'negotiating',
    progress          INTEGER NOT NULL DEFAULT 0,
    escrow_cents      INTEGER NOT NULL DEFAULT 0,
    next_milestone    TEXT NOT NULL DEFAULT '',
    due               TEXT NOT NULL DEFAULT '',
    timeline          TEXT NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_freelancer ON deals(freelancer_user_id);

CREATE TABLE IF NOT EXISTS milestones (
    id           TEXT PRIMARY KEY,
    deal_id      TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL,
    title        TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    due_text     TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_milestones_deal ON milestones(deal_id);

CREATE TABLE IF NOT EXISTS transactions (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deal_id        TEXT,
    type           TEXT NOT NULL,
    amount_cents   INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'completed',
    rail           TEXT NOT NULL DEFAULT 'Bidline escrow',
    description    TEXT NOT NULL DEFAULT '',
    counterparty   TEXT NOT NULL DEFAULT '',
    external_id    TEXT NOT NULL DEFAULT '',
    date_text      TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

CREATE TABLE IF NOT EXISTS activity (
    id         TEXT PRIMARY KEY,
    actor      TEXT NOT NULL DEFAULT '',
    action     TEXT NOT NULL DEFAULT '',
    meta       TEXT NOT NULL DEFAULT '',
    user_id    TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paypal_orders (
    id              TEXT PRIMARY KEY,
    deal_id         TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_order_id TEXT NOT NULL,
    amount_cents    INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'created',
    approval_url    TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id         TEXT PRIMARY KEY,
    provider   TEXT NOT NULL,
    event_id   TEXT NOT NULL UNIQUE,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
`
