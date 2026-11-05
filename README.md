# Congress Game

An online, real-time quiz and survey tournament for up to 200 players in one room. Players join through a QR code or six-digit code, use a persistent anonymous Firebase identity, and receive live round updates. Host accounts create and control games; a separate display view is designed for a projector.

This implementation follows the **online / weak internet** direction. It is not a fully offline LAN server. A brief dropout preserves identity and confirmed answers, and unconfirmed answers retry while their round remains open. Answers that reach the server after the deadline receive no credit.

## Stack

- Next.js App Router, React, TypeScript, plain responsive CSS
- Firebase Authentication: anonymous players and email/password hosts
- Firebase Realtime Database: live public game state and private player records
- Next.js server routes with Firebase Admin: trusted authorisation, scoring and game control
- QR codes generated locally in the browser; no external QR service or font dependency

The Next.js server routes replace the initially proposed Cloud Functions for this MVP. Deploy Next.js to a Node-capable host. Do not use a static export.

## Run locally

Install Node.js 22 or newer, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The home page and setup screens work before Firebase is configured. Live rooms require the following setup.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Anonymous** and **Email/Password** providers.
3. Create a **Realtime Database** (not Firestore). Copy its exact URL.
4. Copy the Web app config into the five `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local`.
5. Create the host user in Firebase Authentication. Copy its UID into `HOST_UIDS`. Multiple authorised UIDs are separated by commas. Each room can be controlled only by its creator.
6. Generate a service account in Project settings → Service accounts. Put its entire JSON on one line into `FIREBASE_SERVICE_ACCOUNT` on the server. In `.env.local`, wrap the JSON in single quotes. Never place it in a public variable or commit it.
7. Publish `database.rules.json` through the Realtime Database rules editor. Alternatively, install the Firebase CLI, select your project, and run `firebase deploy --only database`.
8. Add your deployed domain to Firebase Authentication's authorised domains. Add `localhost` for development if it is not already present.
9. Restart the development server after changing environment variables. On hosted deployments, set every variable and rebuild, because public configuration is embedded during the build.

Do not send service account keys through chat. Configure them directly in your development environment or hosting dashboard.

### Environment variables

| Variable | Where to find it | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web app configuration | Public |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Web app configuration | Public |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database console | Public |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Web app configuration | Public |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app configuration | Public |
| `HOST_UIDS` | Authentication → Users → host UID | Server only |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON | Server only; secret |

## Play a game

1. The host opens `/host` and signs in.
2. Edit the sample rounds or create new ones. Each round supports 2–4 options in the API; the editor supports adding and removing options. Choose a scored quiz or an unscored survey, select the correct answer for quizzes, and set a 10–180 second limit.
3. Open the room. Share its join link, six-digit code or QR code.
4. Open the big-screen display in a second tab and project it.
5. Players open `/play`, enter their name and game code, and wait in the lobby.
6. Start once everyone is ready. The clock uses the server deadline; each player can submit one answer per round.
7. After the clock ends, the open host tab reveals the results automatically. A connected player can also trigger the server-controlled reveal if the host is disconnected. The host chooses when to advance.
8. After the final round, export scores, choices and per-round points as CSV.

Keep the host control room open to advance rounds. If it disconnects, the deadline still closes answers and connected player browsers can trigger the results reveal. If everyone is disconnected, the reveal waits until a host or player reconnects. Refreshing or reopening a room in the same browser resumes it; a host can also reopen a six-digit room from the editor. A player who refreshes uses their existing identity and answers. Clearing browser data or changing browsers creates a new player identity.

## Scoring and integrity

- Correct quiz answer: 500–1,000 points, based on **server receipt time**.
- Wrong answer or survey: zero points.
- Ties share competition ranks (1, 1, 3).
- Private questions never appear in public game state before their round; the correct choice is published at reveal.
- Answer retries are idempotent. Player score and answer are committed in one per-player database transaction, avoiding one shared transaction for all 200 answers.
- Database client writes are denied. Players may read public room state and their own record. Host operations check an allowlisted identity and room ownership on the server.
- Joining is capped by an atomic 200-member roster. New players must join in the lobby; returning players can resume after play starts.

## Connection behaviour

Realtime Database reconnects automatically. The UI shows connection status and uses Firebase's server time offset for countdowns. A selected answer is stored on that device and retried if confirmation is interrupted; retrying does not change the original recorded choice or add points twice. New answer buttons are disabled while disconnected. Reconnection cannot extend a round deadline. Host drafts are saved in browser storage. Validated question sets can also be saved to the host account and reused on another device.

This improves resilience to short interruptions. It cannot guarantee uninterrupted play with no internet, and the webpage must first load online. Anonymous authentication and Realtime Database both depend on Firebase availability.

## Checks and remaining validation

```sh
npm test
npm run typecheck
npm run build
```

Automated checks cover scoring, validation, ranking, repeated submissions and deadline enforcement. The application builds without Firebase credentials. Full live Firebase tests, database rule checks, reconnect trials and a 200-device/simulated-player load test must run against your configured project before a real event. Check Firebase authentication quotas and the hosting plan before putting 200 people on one venue network. This is a 200-player capacity target, not a measured production throughput claim.

No production Firebase connection or deployment is included in the repository. Configure the project first; then verify host → join → start → answer → reveal → advance → export, including duplicate submissions and interrupted connections.

## Host tools

- Import and export question sets as JSON. Export the sample draft to see the supported shape; either an array of questions or `{ "title": "…", "questions": […] }` is accepted. Import validates every prompt, option, correct answer and time limit before replacing the draft.
- Add/remove options (2–4 per round) and move rounds up or down.
- Save question sets to your host account, load them later or delete them without changing existing games.
- Open recent rooms from the game library, reuse a room’s question set, and download a finished room’s CSV. New history entries are recorded by this implementation; older rooms can still be reopened by code.
- Request a password reset from the sign-in screen. Account creation and host authorisation remain in the Firebase console.
- Players can review each completed round after a game ends. Future/unplayed rounds are excluded.

## Local integration harness

With Node.js 22 and Java 17 installed, run `npm run test:integration`. This downloads a pinned Firebase CLI and starts local Auth and Realtime Database emulators with a demo project. The harness never targets a live Firebase project.

It checks room ownership, player authorisation, the 200-player admission cap, 200 simultaneous answer requests, duplicate retries, deadline rejection, surveys, automatic reveal, final review, exports, rejoining, room history and database isolation. It starts its own production server on port 3105; emulator ports 9000 and 9099 must be free.

**Current verification limit:** the harness was attempted here but timed out on the database connection before reaching the player load check. This environment’s Firebase server SDK routes WebSocket connections through its configured proxy, including local emulator requests. No 200-player throughput result is claimed. Run the harness on a normal local development machine, then verify the deployed project on the event network.

GitHub CI is configured to run unit tests, TypeScript checks and the production build without requiring Firebase credentials. Live Firebase integration and venue connectivity remain separate acceptance checks.
