// Перенос участников из старого members.json (только ФИО и email, старые пароли не переносятся).
// Запуск: npm run import-members -- ../src/assets/members.json
import fs from "node:fs";
import { config } from "../config.js";
import { openDb } from "../db.js";

const file = process.argv[2];
if (!file) {
  console.error("Укажите путь к members.json");
  process.exit(1);
}
const db = openDb(config.dbPath);
const upsert = db.prepare(
  `INSERT INTO participants (name, email) VALUES (?, ?)
   ON CONFLICT(email) DO UPDATE SET name = excluded.name`
);
let count = 0;
db.transaction(() => {
  for (const m of JSON.parse(fs.readFileSync(file, "utf8"))) {
    if (!m.title || !m.email || m.title === "Пропустить") continue;
    upsert.run(m.title.trim(), m.email.trim().toLowerCase());
    count++;
  }
})();
console.log(`Импортировано участников: ${count}`);
