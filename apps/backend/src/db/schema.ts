import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.resolve(env.DATABASE_URL);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  runMigrations(_db);
  return _db;
}

function runMigrations(db: Database.Database) {
  // Migrate user_credits from cents to wei if the old column still exists
  const cols = (db.prepare("PRAGMA table_info(user_credits)").all() as { name: string }[]).map(c => c.name);
  if (cols.includes("credits_cents") && !cols.includes("credits_wei")) {
    db.exec(`
      ALTER TABLE user_credits ADD COLUMN credits_wei TEXT NOT NULL DEFAULT '0';
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      skill_id_onchain TEXT UNIQUE,
      creator_address TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      storage_hash TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      price_usd REAL NOT NULL,
      price_wei TEXT NOT NULL,
      content TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      total_runs INTEGER NOT NULL DEFAULT 0,
      tx_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL REFERENCES skills(id),
      user_address TEXT NOT NULL,
      skill_content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_credits (
      user_address TEXT PRIMARY KEY,
      credits_wei  TEXT NOT NULL DEFAULT '0'
    );

    CREATE TABLE IF NOT EXISTS topup_txs (
      tx_hash     TEXT PRIMARY KEY,
      user_address TEXT NOT NULL,
      amount_wei  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL REFERENCES skills(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      user_address TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, user_address)
    );

    CREATE INDEX IF NOT EXISTS idx_skills_creator ON skills(creator_address);
    CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_address);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_skill ON ratings(skill_id);
  `);
}
