CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'trialing',
  subscription_current_period_end TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS waiting_pool (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_waiting_pool_joined_at ON waiting_pool(joined_at);

CREATE TABLE IF NOT EXISTS pairs (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_code_a TEXT NOT NULL,
  partner_code_b TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  CHECK (user_a_id <> user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_pairs_user_a_id ON pairs(user_a_id, status);
CREATE INDEX IF NOT EXISTS idx_pairs_user_b_id ON pairs(user_b_id, status);
CREATE INDEX IF NOT EXISTS idx_pairs_status ON pairs(status);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (pair_id, user_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_entries_pair_day ON entries(pair_id, day_index);

