// Резервная копия базы без остановки сервера: npm run backup -- /путь/к/папке
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { openDb } from "../db.js";

const dir = path.resolve(process.argv[2] || "./backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const file = path.join(dir, `opros-${stamp}.db`);

openDb(config.dbPath).exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
console.log(`Копия сохранена: ${file}`);
