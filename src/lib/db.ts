import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const uploadsDir = UPLOADS_DIR;

declare global {
  var __rateitDb: Database.Database | undefined;
}

function init(): Database.Database {
  const db = new Database(path.join(DATA_DIR, "rateit.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_key TEXT,
      role TEXT NOT NULL DEFAULT 'rater',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      last_model_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_key ON users(name_key) WHERE name_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_models_sku ON models(sku) WHERE sku IS NOT NULL AND sku != '';

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      model_id TEXT REFERENCES models(id) ON DELETE CASCADE,
      original_name TEXT,
      filename TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_images_model ON images(model_id);

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, model_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_model ON ratings(model_id);
  `);

  return db;
}

export const db = globalThis.__rateitDb ?? init();

if (process.env.NODE_ENV !== "production") {
  globalThis.__rateitDb = db;
}
