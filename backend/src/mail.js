import nodemailer from "nodemailer";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function buildCredentialsMessage({ name, email, password, url }) {
  return {
    subject: "Первый этап новогоднего голосования Mega-Personal 2026: Ваш доступ",
    text: [
      `${name}, здравствуйте!`,
      "",
      "Приглашаем Вас принять участие в Первом этапе новогоднего голосования, который пройдет с 11 по 17 ноября 2026.",
      "",
      url,
      `Логин: ${email}`,
      `Пароль: ${password}`,
      "",
      "Голосование проходит в два тура, в каждом туре можно проголосовать один раз.",
    ].join("\n"),
    html: `
      <p>${escapeHtml(name)}, здравствуйте!</p>
      <p>Приглашаем Вас принять участие в Первом этапе новогоднего голосования, который пройдет с 11 по 17 ноября 2026.</p>
      <p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
      <p><strong>Логин:</strong> ${escapeHtml(email)}<br />
         <strong>Пароль:</strong> ${escapeHtml(password)}</p>
      <p>Голосование проходит в два тура, в каждом туре можно проголосовать один раз.</p>
    `,
  };
}

export function buildRoundTwoMessage({ name, url }) {
  return {
    subject: "Второй этап новогоднего голосования Mega-Personal 2026: Ваш доступ",
    text: [
      `${name}, здравствуйте!`,
      "",
      "Приглашаем Вас принять участие в Финальном туре новогоднего голосования, который пройдет с 24 по 30 ноября 2026.",
      "",
      url,
    ].join("\n"),
    html: `
      <p>${escapeHtml(name)}, здравствуйте!</p>
      <p>Приглашаем Вас принять участие в Финальном туре новогоднего голосования, который пройдет с 24 по 30 ноября 2026.</p>
      <p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
    `,
  };
}

// Возвращает { configured, sendCredentials } . Без SMTP_HOST/USER/PASS рассылка выключена.
export function createMailer(config) {
  const { host, port, secure, user, pass, from } = config.smtp;
  if (!host || !user || !pass) {
    return { configured: false };
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 1,
    maxMessages: 200,
    rateDelta: 60_000,
    rateLimit: 10,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    auth: { user, pass },
    tls: { rejectUnauthorized: !host.includes("192.168") },
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return {
    configured: true,
    async sendCredentials({ name, email, password }) {
      const url = config.appUrl;
      const message = buildCredentialsMessage({ name, email, password, url });
      await transporter.sendMail({
        from: from || user,
        to: email,
        ...message,
      });
    },
    async sendRoundTwoNotice({ name, email }) {
      const url = config.appUrl;
      const message = buildRoundTwoMessage({ name, url });
      await transporter.sendMail({
        from: from || user,
        to: email,
        ...message,
      });
    },
  };
}
