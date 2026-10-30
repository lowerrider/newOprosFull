import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.js";
import { createApp } from "../src/app.js";

const config = { jwtSecret: "test", adminEmail: "admin@test", adminPassword: "adminpass", corsOrigin: [] };

test("рассылка паролей: пароль из письма работает, ошибка отправки не меняет пароль", async () => {
  const outbox = [];
  const mailer = {
    configured: true,
    async sendCredentials(message) {
      if (message.email === "bad@test.ru") throw new Error("mailbox unavailable");
      outbox.push(message);
    },
  };
  const server = createApp(openDb(":memory:"), config, mailer).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  try {
    const admin = (await call("POST", "/auth/login", { email: "admin@test", password: "adminpass" })).body.token;
    await call("POST", "/admin/participants", [
      { name: "Анна", email: "anna@test.ru" },
      { name: "Плохой", email: "bad@test.ru" },
      { name: "Без почты" },
    ], admin);

    const first = (await call("POST", "/admin/participants/send-credentials", {}, admin)).body;
    assert.deepEqual(first.sent, ["anna@test.ru"]);
    assert.equal(first.failed[0].email, "bad@test.ru");
    assert.equal(outbox.length, 1);

    const login = await call("POST", "/auth/login", { email: "anna@test.ru", password: outbox[0].password });
    assert.equal(login.status, 200);

    // повторная рассылка уходит только тем, кому ещё не отправили
    const second = (await call("POST", "/admin/participants/send-credentials", {}, admin)).body;
    assert.deepEqual(second.sent, []);
    assert.equal(second.failed.length, 1);

    const list = (await call("GET", "/admin/participants", undefined, admin)).body;
    assert.ok(list.find((p) => p.email === "anna@test.ru").credentialsSentAt);
    assert.equal(list.find((p) => p.email === "bad@test.ru").hasPassword, false);
  } finally {
    server.close();
  }
});

test("без SMTP рассылка отвечает понятной ошибкой", async () => {
  const server = createApp(openDb(":memory:"), config).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const { token } = await (await fetch(base + "/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test", password: "adminpass" }),
    })).json();
    const res = await fetch(base + "/admin/participants/send-credentials", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}",
    });
    assert.equal(res.status, 503);
  } finally {
    server.close();
  }
});
