import fs from "node:fs";
import { isIP } from "node:net";
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
  regularAdminEmail: (process.env.REGULAR_ADMIN_EMAIL || "").toLowerCase(),
  regularAdminPassword: process.env.REGULAR_ADMIN_PASSWORD || "",
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
  if (
    config.jwtSecret.length < 32 ||
    /^(dev-secret|change-me|CHANGE_ME)/i.test(config.jwtSecret)
  ) {
    throw new Error("Задайте уникальный JWT_SECRET длиной не менее 32 символов в .env");
  }
  if (
    config.adminPassword.length < 12 ||
    /^(admin|change-me|CHANGE_ME)/i.test(config.adminPassword)
  ) {
    throw new Error("Задайте уникальный ADMIN_PASSWORD длиной не менее 12 символов в .env");
  }
  if (config.regularAdminEmail || config.regularAdminPassword) {
    if (!config.regularAdminEmail || config.regularAdminPassword.length < 12) {
      throw new Error("Задайте REGULAR_ADMIN_EMAIL и REGULAR_ADMIN_PASSWORD длиной не менее 12 символов");
    }
    if (/^(admin|manager|change-me|CHANGE_ME)/i.test(config.regularAdminPassword)) {
      throw new Error("Замените небезопасный REGULAR_ADMIN_PASSWORD в .env");
    }
    if (config.regularAdminEmail === config.adminEmail) {
      throw new Error("ADMIN_EMAIL и REGULAR_ADMIN_EMAIL должны отличаться");
    }
  }

  let appOrigin;
  try {
    const appUrl = new URL(config.appUrl);
    // Первый setup допускает временный запуск по IP до подключения домена/certbot.
    if (appUrl.protocol !== "https:" && !isIP(appUrl.hostname)) throw new Error();
    appOrigin = appUrl.origin;
  } catch {
    throw new Error("APP_URL в production должен быть полным HTTPS-адресом");
  }
  if (!config.corsOrigin.includes(appOrigin)) {
    throw new Error("CORS_ORIGIN должен содержать origin из APP_URL");
  }

  if (config.smtp.pass && (!config.smtp.host || !config.smtp.user)) {
    throw new Error("Для SMTP_PASS также заполните SMTP_HOST и SMTP_USER");
  }
}
