-- Live session sync for the Secretariat dashboard.
--
-- The server is a relay, not a domain model: it stores whatever JSON the chair's
-- browser sends and hands it back. All the rules of procedure stay client-side,
-- so there is no second implementation of them here to drift out of step.

CREATE TABLE IF NOT EXISTS committee_state (
  committee_id TEXT PRIMARY KEY,
  -- The chair's clock, translated to server time before it was stored.
  updated_at   INTEGER NOT NULL,
  -- When this server actually received it, for staleness checks.
  received_at  INTEGER NOT NULL,
  summary      TEXT NOT NULL,
  snapshot     TEXT NOT NULL
);

-- Log entries live in their own table so the combined, cross-committee feed is
-- one indexed query rather than six JSON blobs merged in the browser.
CREATE TABLE IF NOT EXISTS session_log (
  id           TEXT PRIMARY KEY,
  committee_id TEXT NOT NULL,
  at           INTEGER NOT NULL,
  type         TEXT NOT NULL,
  summary      TEXT NOT NULL,
  detail       TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_log_at ON session_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_session_log_committee ON session_log (committee_id, at DESC);
