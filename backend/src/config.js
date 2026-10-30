import fs from "node:fs";
import path from "node:path";

// Простая загрузка .env без зависимостей
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  // На сервере 127.0.0.1: бекенд доступен только nginx, снаружи порт закрыт
  host: process.env.HOST || "0.0.0.0",
  dbPath: process.env.DB_PATH || "./data/opros.db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  adminEmail: (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Адрес клиента для ссылки в письме с паролем
  appUrl: process.env.APP_URL || "http://localhost:5173",
  // Почта, как в omega-web: SMTP через nodemailer
  smtp: {
    host: process.env.SMTP_HOST?.trim() || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM?.trim() || "",
  },
};

if (process.env.NODE_ENV === "production") {
  if (config.jwtSecret === "dev-secret" || config.jwtSecret === "change-me") {
    throw new Error("Задайте JWT_SECRET в .env");
  }
  if (config.adminPassword === "admin" || config.adminPassword === "change-me") {
    throw new Error("Задайте ADMIN_PASSWORD в .env");
  }
}
