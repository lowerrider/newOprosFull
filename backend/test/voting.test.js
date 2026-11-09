import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.js";
import { createApp } from "../src/app.js";
import { pickFinalists } from "../src/voting.js";

const config = {
  jwtSecret: "test",
  adminEmail: "admin@test",
  adminPassword: "adminpass",
  corsOrigin: [],
};

async function startServer() {
  const db = openDb(":memory:");
  const server = createApp(db, config).listen(0);
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
  return { server, call };
}

test("импорт участников повторяемый и проверяет email", async () => {
  const { server, call } = await startServer();
  try {
    const admin = (await call("POST", "/auth/login", { email: "admin@test", password: "adminpass" })).body.token;
    const first = await call("POST", "/admin/participants", [
      { name: "Анна", email: "ANNA@test.ru" },
      { name: "Без почты", email: "" },
    ], admin);
    assert.equal(first.status, 201);
    assert.deepEqual(first.body, { added: 2, updated: 0, skipped: 0 });

    const repeated = await call("POST", "/admin/participants", [
      { name: "Анна Новая", email: "anna@test.ru" },
      { name: "Без почты" },
    ], admin);
    assert.deepEqual(repeated.body, { added: 0, updated: 1, skipped: 1 });

    const invalid = await call(
      "POST",
      "/admin/participants",
      { name: "Ошибка", email: "not-an-email" },
      admin
    );
    assert.equal(invalid.status, 400);

    const participants = (await call("GET", "/admin/participants", undefined, admin)).body;
    assert.equal(participants.length, 2);
    assert.equal(participants.find((p) => p.email)?.name, "Анна Новая");
  } finally {
    server.close();
  }
});

test("pickFinalists: топ-3 и ничья на 3-м месте", () => {
  const rows = [
    { id: 1, votes: 5 },
    { id: 2, votes: 4 },
    { id: 3, votes: 2 },
    { id: 4, votes: 2 },
    { id: 5, votes: 1 },
  ];
  assert.deepEqual(pickFinalists(rows).map((r) => r.id), [1, 2, 3, 4]);
  assert.deepEqual(pickFinalists([{ id: 1, votes: 1 }, { id: 2, votes: 0 }]).map((r) => r.id), [1]);
});

test("полный сценарий: участники, пароли, два тура", async () => {
  const { server, call } = await startServer();
  try {
    const admin = (await call("POST", "/auth/login", { email: "admin@test", password: "adminpass" })).body.token;
    assert.ok(admin);

    const people = ["Анна", "Борис", "Вера", "Глеб", "Дина"].map((name, i) => ({
      name,
      email: `u${i}@test.ru`,
    }));
    assert.equal((await call("POST", "/admin/participants", people, admin)).status, 201);
    const participants = (await call("GET", "/admin/participants", undefined, admin)).body;
    assert.equal(participants.length, 5);
    const id = Object.fromEntries(participants.map((p) => [p.name, p.id]));

    const creds = (await call("POST", "/admin/participants/passwords", {}, admin)).body;
    assert.equal(creds.length, 5);
    // повторно генерируются только недостающие
    assert.equal((await call("POST", "/admin/participants/passwords", {}, admin)).body.length, 0);

    const nom1 = (await call("POST", "/admin/nominations", { title: "Номинация 1" }, admin)).body.id;
    const nom2 = (await call("POST", "/admin/nominations", { title: "Номинация 2" }, admin)).body.id;
    await call("PUT", `/admin/rounds/1/nominations/${nom1}/candidates`, { participantIds: Object.values(id) }, admin);
    await call("PUT", `/admin/rounds/1/nominations/${nom2}/candidates`, { participantIds: [id["Анна"], id["Борис"]] }, admin);

    const tokens = {};
    for (const c of creds) {
      const r = await call("POST", "/auth/login", { email: c.email.toUpperCase(), password: c.password });
      assert.equal(r.status, 200);
      tokens[c.name] = r.body.token;
    }
    assert.equal((await call("POST", "/auth/login", { email: "u0@test.ru", password: "wrong" })).status, 401);

    // тур закрыт
    assert.equal((await call("GET", "/ballot", undefined, tokens["Анна"])).body.round, null);
    // участник не может в админку
    assert.equal((await call("GET", "/admin/participants", undefined, tokens["Анна"])).status, 403);

    assert.equal((await call("POST", "/admin/rounds/1/open", undefined, admin)).status, 200);
    const ballot = (await call("GET", "/ballot", undefined, tokens["Анна"])).body;
    assert.equal(ballot.round, 1);
    assert.equal(ballot.nominations.length, 2);

    // не все номинации выбраны
    assert.equal((await call("POST", "/ballot", { choices: { [nom1]: id["Анна"] } }, tokens["Анна"])).status, 400);
    // номинант не из списка номинации
    assert.equal(
      (await call("POST", "/ballot", { choices: { [nom1]: id["Анна"], [nom2]: id["Вера"] } }, tokens["Анна"])).status,
      400
    );

    const votes1 = {
      Анна: [id["Борис"], id["Анна"]],
      Борис: [id["Вера"], id["Анна"]],
      Вера: [id["Борис"], null],
      Глеб: [id["Глеб"], id["Борис"]],
      Дина: [id["Дина"], id["Анна"]],
    };
    for (const [name, [a, b]] of Object.entries(votes1)) {
      const r = await call("POST", "/ballot", { choices: { [nom1]: a, [nom2]: b } }, tokens[name]);
      assert.equal(r.status, 201, JSON.stringify(r.body));
    }
    // второй раз в том же туре нельзя
    assert.equal(
      (await call("POST", "/ballot", { choices: { [nom1]: id["Анна"], [nom2]: id["Анна"] } }, tokens["Анна"])).status,
      409
    );
    assert.equal((await call("GET", "/ballot", undefined, tokens["Анна"])).body.hasVoted, true);

    // 2 тур нельзя открыть, пока открыт 1
    assert.equal((await call("POST", "/admin/rounds/2/open", undefined, admin)).status, 409);
    await call("POST", "/admin/rounds/1/close", undefined, admin);

    const res1 = (await call("GET", "/admin/rounds/1/results", undefined, admin)).body;
    assert.equal(res1.voted, 5);
    const n1 = res1.nominations.find((n) => n.id === nom1);
    assert.equal(n1.results[0].name, "Борис");
    assert.equal(n1.results[0].votes, 2);
    assert.equal(res1.nominations.find((n) => n.id === nom2).skipped, 1);

    assert.equal((await call("POST", "/admin/rounds/2/generate", undefined, admin)).status, 200);
    const noms = (await call("GET", "/admin/nominations", undefined, admin)).body;
    // Борис 2, затем ничья по 1 голосу у Вера/Глеб/Дина: проходят все
    assert.deepEqual(
      noms.find((n) => n.id === nom1).candidates[2].map((c) => c.name),
      ["Борис", "Вера", "Глеб", "Дина"]
    );
    assert.deepEqual(noms.find((n) => n.id === nom2).candidates[2].map((c) => c.name), ["Анна", "Борис"]);

    await call("POST", "/admin/rounds/2/open", undefined, admin);
    const b2 = (await call("GET", "/ballot", undefined, tokens["Анна"])).body;
    assert.equal(b2.round, 2);
    assert.equal(b2.hasVoted, false);
    assert.equal(
      (await call("POST", "/ballot", { choices: { [nom1]: id["Борис"], [nom2]: id["Анна"] } }, tokens["Анна"])).status,
      201
    );
    // во 2 туре можно голосовать только за финалистов
    assert.equal(
      (await call("POST", "/ballot", { choices: { [nom1]: id["Анна"], [nom2]: id["Анна"] } }, tokens["Борис"])).status,
      400
    );
    const missing = (await call("GET", "/admin/rounds/2/missing", undefined, admin)).body;
    assert.equal(missing.length, 4);
  } finally {
    server.close();
  }
});

test("вход: много успешных входов с одного IP не блокируются, перебор пароля блокируется", async () => {
  const { server, call } = await startServer();
  try {
    for (let i = 0; i < 15; i++) {
      assert.equal((await call("POST", "/auth/login", { email: "admin@test", password: "adminpass" })).status, 200);
    }
    for (let i = 0; i < 10; i++) {
      assert.equal((await call("POST", "/auth/login", { email: "x@test.ru", password: "bad" })).status, 401);
    }
    assert.equal((await call("POST", "/auth/login", { email: "x@test.ru", password: "bad" })).status, 429);
    // другой email с того же IP не заблокирован
    assert.equal((await call("POST", "/auth/login", { email: "admin@test", password: "adminpass" })).status, 200);
  } finally {
    server.close();
  }
});
