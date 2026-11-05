// Run only inside Firebase emulators. Never writes to a live project.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
const project = "demo-congress";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const databaseHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (
  !authHost ||
  !databaseHost ||
  !/^(127\.0\.0\.1|localhost):\d+$/.test(authHost) ||
  !/^(127\.0\.0\.1|localhost):\d+$/.test(databaseHost)
)
  throw new Error("Local Firebase Auth and Database emulators are required.");
const app = initializeApp({
  projectId: project,
  databaseURL: `http://${databaseHost}?ns=${project}-default-rtdb`,
});
const db = getDatabase(app);
async function signup(email) {
  const r = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(
        email
          ? { email, password: "emulator-only-pass", returnSecureToken: true }
          : { returnSecureToken: true },
      ),
    },
  );
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
}
console.log("Creating emulator host accounts");
const host = await signup(`host-${Date.now()}@example.test`);
const otherHost = await signup(`other-${Date.now()}@example.test`);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3105",
  ],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
      NEXT_PUBLIC_FIREBASE_DATABASE_URL: `http://${databaseHost}?ns=${project}-default-rtdb`,
      HOST_UIDS: `${host.localId},${otherHost.localId}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
const url = "http://127.0.0.1:3105";
async function call(user, path, body, expected = 200) {
  if (!["join", "answer"].includes(body.action))
    console.log("API", body.action);
  const response = await fetch(url + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: `Bearer ${user.idToken}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    expected,
    `${body.action}: ${JSON.stringify(result)}`,
  );
  return result;
}
const questions = [
  {
    text: "Which option is correct?",
    options: ["Yes", "No"],
    correct: 0,
    seconds: 180,
    type: "quiz",
  },
  {
    text: "Choose your favourite",
    options: ["One", "Two"],
    correct: -1,
    seconds: 10,
    type: "survey",
  },
];
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, log);
  await call(null, "/api/host", { action: "check" }, 401);
  const { code } = await call(host, "/api/host", {
    action: "create",
    title: "Integration 200 players",
    questions,
  });
  await call(otherHost, "/api/host", { action: "start", code }, 403);
  const users = [];
  // Moderate parallel admission pressure; answer submissions below are simultaneous.
  for (let batch = 0; batch < 20; batch++) {
    const group = await Promise.all(Array.from({ length: 10 }, () => signup()));
    await Promise.all(
      group.map((u, i) =>
        call(u, "/api/game", {
          action: "join",
          code,
          name: `Player ${batch * 10 + i}`,
        }),
      ),
    );
    users.push(...group);
  }
  const overflow = await signup();
  await call(
    overflow,
    "/api/game",
    { action: "join", code, name: "Overflow" },
    409,
  );
  await call(users[0], "/api/host", { action: "check" }, 403);
  await call(host, "/api/host", { action: "start", code });
  const begin = Date.now();
  await Promise.all(
    users.map((u) =>
      call(u, "/api/game", { action: "answer", code, round: 0, choice: 0 }),
    ),
  );
  console.log(
    `200 simultaneous answer requests completed in ${Date.now() - begin}ms`,
  );
  const before = (
    await db.ref(`games/${code}/players/${users[0].localId}`).get()
  ).val();
  await Promise.all(
    Array.from({ length: 10 }, () =>
      call(users[0], "/api/game", {
        action: "answer",
        code,
        round: 0,
        choice: 1,
      }),
    ),
  );
  const after = (
    await db.ref(`games/${code}/players/${users[0].localId}`).get()
  ).val();
  assert.equal(after.score, before.score);
  assert.equal(after.answers.q1.choice, 0);
  await call(users[0], "/api/game", { action: "results", code }, 409);
  await db.ref(`games/${code}/public/endsAt`).set(Date.now() - 2000);
  await call(users[0], "/api/game", { action: "sync", code });
  let pub = (await db.ref(`games/${code}/public`).get()).val();
  assert.equal(pub.counts[0], 200);
  assert.equal(pub.leaderboard.length, 200);
  await call(host, "/api/host", { action: "next", code });
  await call(users[0], "/api/game", {
    action: "answer",
    code,
    round: 1,
    choice: 1,
  });
  await db.ref(`games/${code}/public/endsAt`).set(Date.now() - 2000);
  await call(
    users[1],
    "/api/game",
    { action: "answer", code, round: 1, choice: 0 },
    409,
  );
  await call(host, "/api/host", { action: "reveal", code });
  await call(host, "/api/host", { action: "next", code });
  pub = (await db.ref(`games/${code}/public`).get()).val();
  assert.equal(pub.status, "finished");
  const review = await call(users[0], "/api/game", { action: "results", code });
  assert.equal(review.questions.length, 2);
  assert.equal(review.answers.q2.points, 0);
  const exported = await call(host, "/api/host", { action: "export", code });
  assert.equal(exported.players.length, 200);
  await call(users[0], "/api/game", {
    action: "join",
    code,
    name: "Returning player",
  });
  const rooms = await call(host, "/api/host", { action: "list" });
  assert.ok(
    rooms.rooms.some((r) => r.code === code && r.status === "finished"),
  );
  // Database rules: public data is readable by players; answers/private questions are protected.
  const rest = `http://${databaseHost}/games/${code}`;
  const query = `?ns=${project}-default-rtdb&auth=${encodeURIComponent(users[0].idToken)}`;
  assert.equal((await fetch(`${rest}/public.json${query}`)).status, 200);
  assert.equal((await fetch(`${rest}/questions.json${query}`)).status, 401);
  assert.equal(
    (await fetch(`${rest}/players/${users[1].localId}.json${query}`)).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${rest}/public/title.json${query}`, {
        method: "PUT",
        body: '"tampered"',
      })
    ).status,
    401,
  );
  console.log(
    "PASS: host controls, 200-player capacity, concurrent answers, idempotent retries, deadline, surveys, review, export, rejoin, history and database isolation.",
  );
} catch (error) {
  console.error("Server log:", log);
  throw error;
} finally {
  server.kill("SIGTERM");
  await db.goOffline();
}
