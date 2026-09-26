-- TIS Tech Council: suggestion box schema for Cloudflare D1.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS suggestions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  text        TEXT    NOT NULL CHECK (length(text) BETWEEN 10 AND 1000),
  category    TEXT    NOT NULL CHECK (category IN ('network', 'classroom', 'apps', 'campus', 'other')),
  name        TEXT             CHECK (name IS NULL OR length(name) <= 80),
  grade       TEXT             CHECK (grade IS NULL OR length(grade) <= 20),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON suggestions (category, created_at DESC);

-- Rate limiting. Only a salted SHA-256 hash of the sender's IP is stored,
-- never the IP itself, and rows older than a day are pruned on every insert.
-- Kept apart from `suggestions` so a suggestion can never be traced to a hash.
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL -- unix epoch, seconds
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits (ip_hash, created_at);
