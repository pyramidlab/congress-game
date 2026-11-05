# Delivery verification — 5 November 2026

The app has three linked views: a host starts and controls a session, players submit through Realtime Database rules, and the projector reads a restricted public projection. Cloud Functions compute results and tournament transitions.

| Check | Result | Evidence and scope |
| --- | --- | --- |
| Frontend and Functions TypeScript | Passed | Strict frontend check and backend compilation |
| Production Next.js build | Passed | All five application routes prerendered successfully |
| Engine, CSV and Firebase collection restoration | Passed | 21 automated tests; includes scoring, ties, campus totals, replay, pauses, seeded pairs, two semi-finals, three-survey final and sudden death |
| Realtime Database rules | Passed | 8 emulator tests: early-answer privacy, host claims, first write, forged receipt time, malformed payloads, expired/paused attempts, score protection and private host libraries |
| Firebase backend flow | Passed | Real local Auth → callable Functions → Database; eight players; duplicate name rejection, unauthorized host rejection, protected answers, practice/scored results, identity restoration, template reuse/history, completed-quiz review, pairings, survey controls/undo and CSV export |
| Automatic backup files | Passed | Retrieved the generated player CSV (619 bytes), campus CSV (232 bytes) and game JSON (8,483 bytes) from the local Storage emulator after the podium transition |
| 200-player local load | Passed | 2,000/2,000 accepted answers over ten rounds, 40 clients disconnected/reconnected in round five; 200 unique ranks |
| Load-test timings | Recorded | Local DB emulator: 12,663 ms total, 377 ms median and 928 ms p95 per submission; includes the forced 800 ms dropout |
| Initial player page transfer budget | Passed | 275,852 bytes gzip for prerendered HTML and 11 initial JS/CSS assets, below 512,000-byte target; excludes optional question images and later navigation/downloads |
| Browser demo | Passed | Host start, auto reveal, player answer/score, same-browser refresh recovery; inspected phone at 390 × 844 and desktop host layout |

The load test checks local database receipt, rules and ranking. It is not a 200-player production benchmark, and it does not include Auth account creation, deployed Functions, WAN throttling or venue Wi-Fi. The eight-player backend check exercises the actual callable boundary separately. No live Firebase credentials were supplied, so production Firebase/IAM, optional App Check enforcement and automatic Cloud Tasks reveal are still unverified.

The Windows environment needed a temporary dependency extraction and directory-creation workaround because normal npm/build filesystem operations returned EPERM. Those workarounds are outside the application repository. The committed lockfiles and standard npm scripts are used by GitHub CI and Vercel. Local runtime: Node 24 and Java 25; deployment/CI target: Node 22 and Java 21.

## Acceptance checks still required on the configured deployment

- Create and authorise the Firebase host accounts; verify App Check, rules, Storage backups and scheduled reveal with the real project.
- Confirm the temporary Auth sign-up quota is large enough for 200 phones behind one venue IP.
- Run at least 30 physical phones through all ten questions; refresh, briefly disconnect, duplicate-submit and confirm final/campus ranks.
- Rehearse the projector from the back of the room, test light/dark backdrops, QR and audio, and run a complete tournament.
- Open the downloaded session-specific offline board with connectivity disabled. Keep it and manual exports available on the host laptop.

## Screens and caches

The demo is deliberately local to one browser. Live mode uses the deployed Firebase project. Static assets use Next.js/Vercel browser/CDN caching; live state is never served from a service-worker cache. A pending answer stays visibly unconfirmed until Firebase acknowledges it, and the server deadline still rejects late reconnects.
