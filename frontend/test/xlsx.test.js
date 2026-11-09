import test from "node:test";
import assert from "node:assert/strict";
import { parseParticipantRows } from "../src/utils/xlsx.js";

test("Excel: находит заголовки, удаляет дубли и помечает плохие email", () => {
  const parsed = parseParticipantRows([
    ["Служебная строка"],
    ["ФИО", "email"],
    ["Анна", "ANNA@example.com"],
    ["Анна Новая", "anna@example.com"],
    ["Борис", "not-an-email"],
    ["Вера", ""],
    ["", ""],
  ]);

  assert.deepEqual(parsed.participants, [
    { name: "Анна Новая", email: "anna@example.com" },
    { name: "Борис", email: "" },
    { name: "Вера", email: "" },
  ]);
  assert.equal(parsed.report.sourceRows, 4);
  assert.equal(parsed.report.withEmail, 1);
  assert.equal(parsed.report.withoutEmail, 2);
  assert.equal(parsed.report.duplicateCount, 1);
  assert.deepEqual(parsed.report.invalidEmails, [{ name: "Борис", email: "not-an-email" }]);
});

test("Excel: требует столбцы ФИО и email", () => {
  assert.throws(() => parseParticipantRows([["Имя", "Телефон"], ["Анна", "+7"]]), /ФИО/);
});
