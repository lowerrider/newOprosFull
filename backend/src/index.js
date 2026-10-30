import { config } from "./config.js";
import { openDb } from "./db.js";
import { createApp } from "./app.js";
import { createMailer } from "./mail.js";

const db = openDb(config.dbPath);
createApp(db, config, createMailer(config)).listen(config.port, config.host, () => {
  console.log(`API запущен на http://${config.host}:${config.port}`);
});
