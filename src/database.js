const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(
  "/opt/fs-monitor-platform/data",
  "monitoring.db"
);

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL UNIQUE,
    name TEXT,
    region TEXT,
    hostname TEXT,
    expected_instance_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    last_seen_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY(instance_id) REFERENCES instances(id)
);

CREATE TABLE IF NOT EXISTS user_instances (
    user_id INTEGER NOT NULL,
    instance_id INTEGER NOT NULL,
    PRIMARY KEY(user_id, instance_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(instance_id) REFERENCES instances(id)
);

CREATE TABLE IF NOT EXISTS filesystem_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL,
    collected_at TEXT NOT NULL,
    mount TEXT NOT NULL,
    used_bytes INTEGER NOT NULL,
    capacity_bytes INTEGER NOT NULL,
    free_bytes INTEGER NOT NULL,
    usage_percent REAL NOT NULL,
    FOREIGN KEY(instance_id) REFERENCES instances(id)
);

CREATE INDEX IF NOT EXISTS idx_fs_metrics_instance_time
ON filesystem_metrics(instance_id, collected_at);

CREATE TABLE IF NOT EXISTS directory_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL,
    collected_at TEXT NOT NULL,
    mount TEXT NOT NULL,
    directory_path TEXT NOT NULL,
    used_bytes INTEGER NOT NULL,
    FOREIGN KEY(instance_id) REFERENCES instances(id)
);

CREATE INDEX IF NOT EXISTS idx_dir_metrics_instance_time
ON directory_metrics(instance_id, collected_at);
`);

module.exports = db;
