import test from "node:test";
import assert from "node:assert/strict";
import { firstUnansweredIndex, unansweredCount } from "../src/utils/voteFlow.js";

const nominations = [{ id: 10 }, { id: 20 }, { id: 30 }];

test("голосование: находит первую номинацию без явного выбора", () => {
  const choices = { 10: 101, 30: "skip" };
  assert.equal(firstUnansweredIndex(nominations, choices), 1);
  assert.equal(unansweredCount(nominations, choices), 1);
});

test("голосование: вариант пропуска считается заполненным ответом", () => {
  const choices = { 10: "skip", 20: 202, 30: "skip" };
  assert.equal(firstUnansweredIndex(nominations, choices), -1);
  assert.equal(unansweredCount(nominations, choices), 0);
});
