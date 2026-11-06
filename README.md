# AFCF Ekiti Area · Student Congress 1.0

A phone quiz, campus competition and on-stage survey tournament for Apostolic Faith Campus Fellowship, Ekiti Area Student Congress 1.0, themed **Shine for a Purpose**. This site serves this specific event. Separate host, phone and projector views use Next.js on Vercel with Firebase Authentication and Realtime Database.

The organizer's logo and revised flier are in `public/event/`; the event identity, dates (**6–8 November 2026**) and venue are in `src/lib/event.ts`. The phone join page downloads only the 5 KB logo. The 83 KB flier loads lazily on the welcome page.

## Run locally

Use Node.js 22. Run `npm ci`, then `npm run dev`. Open `http://localhost:3000/host?demo=1&pin=482913` to explore without Firebase. Demo tabs share state only in the same browser.

Routes: `/` welcome, `/host` administrator, `/join` phone, `/display` projector and `/offline-board.html` standalone fallback.

## Game sounds

On the projector display, click **Sound off** to enable local audio. **Sound options** provides volume, a final-countdown preview and a downloadable ZIP of seven original WAV clips. Normal ticks play once per second; the final five seconds use two ticks per second, followed by a time-up cue. Quiz/survey reveals, survey strikes, the podium and winners have separate cues. Pausing stops the countdown and muting stops current playback. Player phones remain silent.

Playback is synthesized locally without streaming or fetching audio files. Downloads are optional. The build generates `/sounds/congress-game-sounds.zip` and individual WAV clips with `scripts/generate-sounds.ts`; these generated assets are excluded from Git. A click is required to enable sound after opening or refreshing the projector page.

## Connect the event's Firebase project

Follow [setup](docs/SETUP.md) and [the operator runbook](docs/RUNBOOK.md). Copy `.env.example` to `.env.local` for local live play. Put server credentials only in `FIREBASE_SERVICE_ACCOUNT`; public web configuration uses `NEXT_PUBLIC_` variables. Host access is controlled by `HOST_UIDS`.

The app runs trusted server routes on Vercel. Firebase Functions and Firebase CLI sign-in are not required. Questions, scores, timers and tournament changes are validated on the server. Players' answer writes use Firebase server timestamps and strict database rules, so Vercel cold starts do not add to answer time.

## Features

- Practice plus an editable quiz, correctness/speed scoring, individual and campus standings, server deadlines and first-answer-only receipt.
- Pause, resume, replay without old points, skip, end, late joins, rename/remove players and automatic top-eight seeded pairings.
- Four teams, two semi-finals and a three-survey final with answer flips, control, strikes, steals, multipliers, sudden death, score correction and undo.
- Manual editing, CSV quiz import, complete JSON question-set import/export, private saved sets, room history, password recovery and completed-player reviews.
- Player/campus CSV exports, automatic private CSV/JSON backup archives at quiz results/session end, and a downloadable offline survey board containing the session's edited surveys.

Sample quiz questions must be replaced by the organisers. The eight starter surveys and campuses are editable before starting. Content is locked after the session starts; saved sets can create new sessions.

## Weak connections and caching

The public stream contains the current question, top ten and campus standings. Phones subscribe to their own answer/result, rather than downloading everyone else's submissions. The countdown renders locally from a server deadline and time offset. Static Next.js assets use normal browser/CDN caching; live state is not cached by a service worker.

An answer stays **Sending** until Firebase acknowledges it. Browser identity and a pending choice survive a refresh; a retry is accepted only for the same open attempt. A late reconnect never extends the deadline. Clearing browser data or changing browsers loses the anonymous identity.

The host and projector request reveal at the deadline; player browsers provide a delayed fallback. The server checks the deadline and serialises the transition. If everyone disconnects, late answers are still rejected and reveal resumes on reconnect. Keep the host/display open for smooth transitions.

Download the offline HTML before the event and test it with connectivity disabled. It has no network, package, image or font dependencies. Its scores remain separate from the online bracket.

## Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check:budget`
- `npm run test:rules` (requires Java 21+)

Run `npm run emulators`, then `npm run test:api` in another terminal to test real Auth → Next.js API → Database with eight players. The API runner starts a production server on port 3105 and uses only the demo project. Run `npm run loadtest` against the database emulator for 200 players, ten rounds and 40 reconnects. It writes `test-results/loadtest.json`.

See [verification scope](docs/VERIFICATION.md). Emulator load results do not measure venue Wi-Fi or production throughput. A 30-phone deployment rehearsal remains necessary.
