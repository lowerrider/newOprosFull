import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const schema = `
CREATE TABLE IF NOT EXISTS participants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  credentials_sent_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nominations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  subtitle   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Туры: 1 и 2. status: draft | open | closed
CREATE TABLE IF NOT EXISTS rounds (
  number INTEGER PRIMARY KEY CHECK (number IN (1, 2)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed'))
);
INSERT OR IGNORE INTO rounds (number) VALUES (1), (2);

-- Номинанты конкретной номинации в конкретном туре
CREATE TABLE IF NOT EXISTS candidates (
  round          INTEGER NOT NULL REFERENCES rounds(number),
  nomination_id  INTEGER NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY (round, nomination_id, participant_id)
);

-- Бюллетень: один на участника в каждом туре
CREATE TABLE IF NOT EXISTS ballots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  round          INTEGER NOT NULL REFERENCES rounds(number),
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (round, participant_id)
);

-- Выбор в каждой номинации. candidate_id = NULL означает «Пропустить»
CREATE TABLE IF NOT EXISTS votes (
  ballot_id     INTEGER NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  nomination_id INTEGER NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  candidate_id  INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  PRIMARY KEY (ballot_id, nomination_id)
);
`;

export function openDb(dbPath) {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  // Встроенный в Node SQLite: ничего не нужно собирать при npm install
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  // Обёртка: fn выполняется в транзакции, при ошибке всё откатывается
  db.transaction = (fn) => (...args) => {
    db.exec("BEGIN");
    try {
      const result = fn(...args);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  db.exec(schema);
  // Миграция баз, созданных до появления рассылки
  const columns = db.prepare("PRAGMA table_info(participants)").all().map((c) => c.name);
  if (!columns.includes("credentials_sent_at")) {
    db.exec("ALTER TABLE participants ADD COLUMN credentials_sent_at TEXT");
  }
  return db;
}
