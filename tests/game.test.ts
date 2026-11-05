import test from "node:test";
import assert from "node:assert/strict";
import {
  recordAnswer,
  pointsFor,
  validateQuestions,
  leaderboard,
  demoQuestions,
  type Player,
} from "../lib/game.ts";
test("correct answers reward speed, with bounds; wrong answers and surveys score zero", () => {
  const q = demoQuestions[0];
  assert.equal(pointsFor(q, 1, 1000, 1000, 21000), 1000);
  assert.equal(pointsFor(q, 1, 11000, 1000, 21000), 750);
  assert.equal(pointsFor(q, 1, 21000, 1000, 21000), 500);
  assert.equal(pointsFor(q, 0, 1000, 1000, 21000), 0);
  assert.equal(pointsFor(demoQuestions[2], 0, 1000, 1000, 31000), 0);
  assert.equal(pointsFor(q, 1, -9000, 1000, 21000), 1000);
});
test("untrusted question payloads reject invalid choices, durations, duplicates and empty prompts", () => {
  assert.throws(() => validateQuestions([]));
  assert.throws(() => validateQuestions([{ ...demoQuestions[0], correct: 9 }]));
  assert.throws(() => validateQuestions([{ ...demoQuestions[0], seconds: 0 }]));
  assert.throws(() =>
    validateQuestions([{ ...demoQuestions[0], seconds: 10.5 }]),
  );
  assert.throws(() => validateQuestions([{ ...demoQuestions[0], text: " " }]));
  assert.throws(() =>
    validateQuestions([{ ...demoQuestions[0], options: ["Mars", " mars "] }]),
  );
  assert.throws(() =>
    validateQuestions([{ ...demoQuestions[0], options: [null, "Mars"] }]),
  );
  assert.throws(() =>
    validateQuestions([{ ...demoQuestions[0], type: "bad" }]),
  );
});
test("question identifiers are generated server-side and surveys cannot contain a correct answer", () => {
  const result = validateQuestions([
    { ...demoQuestions[0], id: "../private", text: " Question " },
    { ...demoQuestions[2], correct: 1 },
  ]);
  assert.equal(result[0].id, "q1");
  assert.equal(result[0].text, "Question");
  assert.equal(result[1].correct, -1);
});
test("leaderboard uses shared competition ranks and deterministic tie ordering", () => {
  const player = (name: string, score: number): Player => ({
    name,
    score,
    answers: {},
    joinedAt: 1,
  });
  const ranks = leaderboard({
    z: player("Zed", 1000),
    a: player("Ada", 1000),
    b: player("Ben", 500),
  });
  assert.deepEqual(
    ranks.map((p) => [p.name, p.rank]),
    [
      ["Ada", 1],
      ["Zed", 1],
      ["Ben", 3],
    ],
  );
  assert.deepEqual(leaderboard({}), []);
});

test("answer retries cannot change a choice or add points twice, even after the deadline", () => {
  const player: Player = {
    name: "Jerome",
    score: 200,
    joinedAt: 1,
    answers: {},
  };
  const first = recordAnswer(
    player,
    demoQuestions[0],
    1,
    1000,
    1000,
    21000,
    1001,
  )!;
  assert.equal(first.score, 1200);
  assert.equal(first.answers.q1.choice, 1);
  assert.equal(
    recordAnswer(first, demoQuestions[0], 0, 5000, 1000, 21000, 22000),
    first,
  );
  assert.equal(player.score, 200);
});
test("unjoined players and late transaction retries cannot earn points", () => {
  const player: Player = { name: "Ada", score: 0, joinedAt: 1, answers: {} };
  assert.equal(
    recordAnswer(null, demoQuestions[0], 1, 1000, 1000, 21000, 1001),
    null,
  );
  assert.equal(
    recordAnswer(player, demoQuestions[0], 1, 21000, 1000, 21000, 21001),
    undefined,
  );
  assert.equal(
    recordAnswer(player, demoQuestions[0], 1, 20000, 1000, 21000, 21001),
    undefined,
  );
  assert.equal(
    recordAnswer(player, demoQuestions[0], 1, 999, 1000, 21000, 1000),
    undefined,
  );
});
