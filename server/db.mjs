// RelayDeck backend — SQLite storage. Uses the built-in node:sqlite module so
// the plugin ships with zero third-party dependencies.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const SCHEMA_VERSION = 2;

/** The original model: everything is a flow run that produces artifacts. */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Platform credentials / login state. Never a password: a cookie jar or a
-- storage-state blob captured from the user's own browser session.
CREATE TABLE IF NOT EXISTS bindings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  platform    TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  platform_uid TEXT NOT NULL DEFAULT '',
  nickname    TEXT NOT NULL DEFAULT '',
  state       TEXT NOT NULL DEFAULT 'unknown',
  secret_json TEXT NOT NULL DEFAULT '{}',
  proxy       TEXT NOT NULL DEFAULT '',
  last_used_at TEXT,
  created_at  TEXT NOT NULL,
  UNIQUE (platform, platform_uid)
);

-- A flow is the product's core entity: source -> filters -> actions.
CREATE TABLE IF NOT EXISTS flows (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  trigger     TEXT NOT NULL DEFAULT 'manual',
  cron        TEXT NOT NULL DEFAULT '',
  spec_json   TEXT NOT NULL,
  last_run_at TEXT,
  last_state  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id     INTEGER,
  flow_name   TEXT NOT NULL DEFAULT '',
  state       TEXT NOT NULL DEFAULT 'running',
  trigger     TEXT NOT NULL DEFAULT 'manual',
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  found       INTEGER NOT NULL DEFAULT 0,
  kept        INTEGER NOT NULL DEFAULT 0,
  saved       INTEGER NOT NULL DEFAULT 0,
  error       TEXT NOT NULL DEFAULT ''
);

-- One row per stage execution: the run trace that makes runs replayable.
CREATE TABLE IF NOT EXISTS run_steps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     INTEGER NOT NULL,
  seq        INTEGER NOT NULL,
  stage      TEXT NOT NULL,
  capability TEXT NOT NULL,
  state      TEXT NOT NULL DEFAULT 'running',
  in_count   INTEGER NOT NULL DEFAULT 0,
  out_count  INTEGER NOT NULL DEFAULT 0,
  detail     TEXT NOT NULL DEFAULT '',
  error      TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps (run_id, seq);

CREATE TABLE IF NOT EXISTS artifacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      INTEGER,
  flow_id     INTEGER,
  platform    TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  author      TEXT NOT NULL DEFAULT '',
  cover_url   TEXT NOT NULL DEFAULT '',
  media_json  TEXT NOT NULL DEFAULT '[]',
  stats_json  TEXT NOT NULL DEFAULT '{}',
  local_path  TEXT NOT NULL DEFAULT '',
  download_state TEXT NOT NULL DEFAULT 'none',
  published   TEXT NOT NULL DEFAULT '',
  collected_at TEXT NOT NULL,
  UNIQUE (platform, item_id)
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run ON artifacts (run_id);
`;

/** v2: publish plans turn a run's artifacts into a reviewable relay step. */
const SCHEMA_2 = `
CREATE TABLE IF NOT EXISTS publish_plans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      INTEGER,
  flow_id     INTEGER,
  platform    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '',
  files_json  TEXT NOT NULL DEFAULT '[]',
  source_platform TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publish_plans_run ON publish_plans (run_id);
`;

export function nowIso() {
  return new Date().toISOString();
}

export function openDatabase(file) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  const current = row ? Number(row.value) : 0;
  if (current >= SCHEMA_VERSION) return;
  if (current < 1) db.exec(SCHEMA);
  if (current < 2) db.exec(SCHEMA_2);
  db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(SCHEMA_VERSION));
}

export function schemaVersion(db) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  return row ? Number(row.value) : 0;
}

export function counts(db) {
  const one = (sql) => Number(db.prepare(sql).get().n);
  return {
    bindings: one("SELECT COUNT(*) AS n FROM bindings"),
    flows: one("SELECT COUNT(*) AS n FROM flows"),
    runs: one("SELECT COUNT(*) AS n FROM runs"),
    artifacts: one("SELECT COUNT(*) AS n FROM artifacts"),
    plans: one("SELECT COUNT(*) AS n FROM publish_plans")
  };
}
