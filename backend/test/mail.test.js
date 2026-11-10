import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.js";
import { createApp } from "../src/app.js";
import { buildCredentialsMessage, buildRoundTwoMessage } from "../src/mail.js";

const config = {
  jwtSecret: "test",
  adminEmail: "admin@test",
  adminPassword: "adminpass",
  corsOrigin: [],
};

test("письмо с доступом содержит персональные данные и даты первого этапа", () => {
  const message = buildCredentialsMessage({
    name: "Репина Ольга Витальевна",
    email: "nastykoocher@gmail.com",
    password: "B7GfZZyX",
    url: "https://www.mega-vote.ru/",
  });

  assert.equal(
    message.subject,
    "Первый этап новогоднего голосования Mega-Personal 2026: Ваш доступ",
  );
  assert.match(message.text, /^Репина Ольга Витальевна, здравствуйте!/);
  assert.match(message.text, /с 11 по 17 ноября 2026\./);
  assert.match(message.text, /https:\/\/www\.mega-vote\.ru\//);
  assert.match(message.text, /Логин: nastykoocher@gmail\.com/);
  assert.match(message.text, /Пароль: B7GfZZyX/);
});

test("письмо второго этапа содержит персональные данные и даты финального тура", () => {
  const message = buildRoundTwoMessage({
    name: "Репина Ольга Витальевна",
    url: "https://www.mega-vote.ru/",
  });

  assert.equal(message.subject, "Второй этап новогоднего голосования Mega-Personal 2026: Ваш доступ");
  assert.match(message.text, /^Репина Ольга Витальевна, здравствуйте!/);
  assert.match(message.text, /Финальном туре/);
  assert.match(message.text, /с 24 по 30 ноября 2026\./);
  assert.doesNotMatch(message.text, /Логин:/);
  assert.doesNotMatch(message.text, /Пароль:/);
});

test("уведомление второго этапа отправляется вручную и не меняет пароль", async () => {
  const outbox = [];
  const mailer = {
    configured: true,
    async sendRoundTwoNotice(message) {
      outbox.push(message);
    },
  };
  const db = openDb(":memory:");
  const server = createApp(db, config, mailer).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, token) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  try {
    const admin = (await call("POST", "/auth/login", { email: "admin@test", password: "adminpass" })).body.token;
    await call("POST", "/admin/participants", [{ name: "Анна", email: "anna@test.ru" }], admin);
    const credentials = (await call(
      "POST",
      "/admin/participants/passwords",
      { onlyMissing: true },
      admin
    )).body;
    const originalPassword = credentials[0].password;

    assert.equal((await call("POST", "/admin/rounds/2/send-notice", undefined, admin)).status, 409);
    db.prepare("UPDATE rounds SET status = 'open' WHERE number = 2").run();

    const result = await call("POST", "/admin/rounds/2/send-notice", undefined, admin);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.sent, ["anna@test.ru"]);
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].name, "Анна");

    const login = await call("POST", "/auth/login", {
      email: "anna@test.ru",
      password: originalPassword,
    });
    assert.equal(login.status, 200);
  } finally {
    server.close();
  }
});

test("рассылка паролей: пароль из письма работает, ошибка отправки не меняет пароль", async () => {
  const outbox = [];
  const mailer = {
    configured: true,
    async sendCredentials(message) {
      if (message.email === "bad@test.ru")
        throw new Error("mailbox unavailable");
      outbox.push(message);
    },
  };
  const server = createApp(openDb(":memory:"), config, mailer).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  try {
    const admin = (
      await call("POST", "/auth/login", {
        email: "admin@test",
        password: "adminpass",
      })
    ).body.token;
    await call(
      "POST",
      "/admin/participants",
      [
        { name: "Анна", email: "anna@test.ru" },
        { name: "Плохой", email: "bad@test.ru" },
        { name: "Без почты" },
      ],
      admin,
    );

    const first = (
      await call("POST", "/admin/participants/send-credentials", {}, admin)
    ).body;
    assert.deepEqual(first.sent, ["anna@test.ru"]);
    assert.equal(first.failed[0].email, "bad@test.ru");
    assert.equal(outbox.length, 1);

    const login = await call("POST", "/auth/login", {
      email: "anna@test.ru",
      password: outbox[0].password,
    });
    assert.equal(login.status, 200);

    // повторная рассылка уходит только тем, кому ещё не отправили
    const second = (
      await call("POST", "/admin/participants/send-credentials", {}, admin)
    ).body;
    assert.deepEqual(second.sent, []);
    assert.equal(second.failed.length, 1);

    const list = (await call("GET", "/admin/participants", undefined, admin))
      .body;
    assert.ok(list.find((p) => p.email === "anna@test.ru").credentialsSentAt);
    assert.equal(
      list.find((p) => p.email === "bad@test.ru").hasPassword,
      false,
    );
  } finally {
    server.close();
  }
});

test("без SMTP рассылка отвечает понятной ошибкой", async () => {
  const server = createApp(openDb(":memory:"), config).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const { token } = await (
      await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@test", password: "adminpass" }),
      })
    ).json();
    const res = await fetch(base + "/admin/participants/send-credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
    assert.equal(res.status, 503);
  } finally {
    server.close();
  }
});
