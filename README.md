# Congress Game

A phone quiz and on-stage survey tournament for a congress gathering. The host, projector and players have separate screens. Built with Next.js, Firebase Auth, Realtime Database, Cloud Functions and Cloud Storage; deploy the frontend to Vercel.

## Try it locally

Use Node.js 22 and npm. Install the frontend and backend dependencies separately:

```sh
npm ci
npm ci --prefix functions
npm run dev
```

Open `http://localhost:3000/host?demo=1&pin=482913`. The demo uses sample players and questions, with shared state across tabs in the same browser. Open the projector from the host screen, and `/join?demo=1&pin=482913` for the phone view. Demo data lives in browser storage; live mode uses Firebase. No Firebase account is needed for the demo.

Routes: `/` welcome, `/host` administrator, `/join` player, `/display` projector, `/offline-board.html` standalone survey fallback.

## Connect a real event

Follow [Firebase and Vercel setup](docs/SETUP.md), then [the operator runbook](docs/RUNBOOK.md). Copy `.env.example` to `.env.local` for local live testing. Public Firebase web configuration belongs in these variables; service account keys and host passwords do not.

The quiz questions are samples and must be replaced by the organisers. All eight starter surveys and campuses are editable before starting a session. Once started, content is locked for that session. Create a new game to use another content set.

Hosts can save complete question sets to an account library, reopen recent games, reuse their content, and import/export question sets as JSON. CSV question import remains available. Password recovery uses Firebase email reset links. Players can review their own completed quiz after the results are announced.

## Weak connections and caching

- A compact public session stream contains the current question, top ten and campus board. Players subscribe to their own answer and result, rather than downloading everybody's answers.
- The countdown renders locally from a server deadline and time offset. It does not broadcast every second.
- Answer writes use a Firebase server timestamp. Rules enforce the current attempt, deadline, active membership and one answer. The phone shows **Sending** until the server acknowledges the write, then **Answer locked in**.
- The browser retains the player's Firebase identity. Refreshing or reconnecting restores membership and results. A pending choice can retry only for the same question attempt; an expired answer is rejected. Clearing browser storage or using another browser loses the identity.
- Next.js fingerprinted assets use normal long-lived browser/CDN caching. Live game and answer data stay in Realtime Database. No service worker caches game state. First load and quiz answer acceptance still require connectivity.
- Download the offline board before arriving. The host download embeds the current survey library. It needs no network, packages, fonts or external images and keeps match state locally. Offline scores are a separate fallback and do not sync into the online tournament.

## Authority and privacy

Scoring and state transitions run in Cloud Functions. Raw answer receipt time comes from Realtime Database, so a cold callable function does not add to a player's answer time. Paused time is excluded. Scores derive from non-voided rounds; replaying voids the old attempt. Ranking uses points, total correct-answer time, then join time. Campus totals use the best five by default.

Private questions, correct answers, raw submissions, backups and host state are denied to ordinary players. Only the current question's public fields are projected; its correct option appears at reveal. Host functions require the `admin` custom claim and production App Check. Rules deny client score and game-state writes. A six-digit PIN identifies a public game; it is not a host credential.

Question deadlines reject late writes even if automatic reveal is delayed. Cloud Tasks closes a question automatically; the host also has a manual reveal button and a visible scheduler error. Results persist after every reveal and automatic CSV/JSON backups are saved at podium, winner and end.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run check:budget
npm run test:rules
```

With a local database emulator already running, run `npm run loadtest`. It simulates 200 players, ten rounds and 40 clients reconnecting in round five. It writes `test-results/loadtest.json`. This checks local database rules, receipt and ranking; it does not measure production Functions, mobile browsers, venue Wi-Fi or geographic latency. See [verification notes](docs/VERIFICATION.md) for the delivery evidence and remaining rehearsal steps.

The GitHub workflow installs both packages and repeats the build, type, engine, rule and local load checks. Use `npm run emulators` for a full local backend rehearsal; task scheduling is bypassed in the emulator, so reveal manually.

With the full emulators running, `npm run test:functions` checks the real Auth/callable/Database flow, saved sets, player reviews, team pairing, survey operations and exports with eight players. This is separate from the 200-client database load test.
