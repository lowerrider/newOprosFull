import nodemailer from "nodemailer";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
    auth: { user, pass },
    tls: { rejectUnauthorized: !host.includes("192.168") },
  });

  return {
    configured: true,
    async sendCredentials({ name, email, password }) {
      const url = config.appUrl;
      await transporter.sendMail({
        from: from || user,
        to: email,
        subject: "Новогоднее голосование Mega-Personal: ваш доступ",
        text: [
          `${name}, здравствуйте!`,
          "",
          "Приглашаем вас принять участие в новогоднем голосовании.",
          "",
          `Ссылка: ${url}`,
          `Логин: ${email}`,
          `Пароль: ${password}`,
          "",
          "Голосование проходит в два тура, в каждом туре можно проголосовать один раз.",
        ].join("\n"),
        html: `
          <p>${escapeHtml(name)}, здравствуйте!</p>
          <p>Приглашаем вас принять участие в новогоднем голосовании.</p>
          <p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
          <p><strong>Логин:</strong> ${escapeHtml(email)}<br />
             <strong>Пароль:</strong> ${escapeHtml(password)}</p>
          <p>Голосование проходит в два тура, в каждом туре можно проголосовать один раз.</p>
        `,
      });
    },
  };
}
