import express from "express";
import cors from "cors";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";

export function createApp(db, config, mailer = { configured: false }) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api", publicRoutes(db, config));
  app.use("/api/admin", adminRoutes(db, config, mailer));

  app.use((req, res) => res.status(404).json({ error: "Не найдено" }));
  app.use((err, req, res, next) => {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    // 2067 = SQLITE_CONSTRAINT_UNIQUE
    if (err.errcode === 2067) {
      return res.status(409).json({ error: "Такая запись уже есть" });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  });
  return app;
}
