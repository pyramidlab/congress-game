# Verification — 5 November 2026

The final architecture is phone/host/projector → Next.js server routes on Vercel → Firebase Auth and Realtime Database. Answer receipt goes directly through strict Firebase rules and server timestamps; server routes compute scores and control the board.

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript and production build | Passed | Frontend, shared engine and server routes; all app/API routes built |
| Engine, CSV, restore and host access | Passed | 22 tests: scoring, ties, campus totals, replay, paused time, seeded pairs, full survey bracket, sudden death, imports, Firebase empty collections and production UID allowlist |
| Database rules | Passed | 8 emulator tests: private answers, first write, forged timestamps, invalid choices, old/paused/expired attempts, score protection and private libraries |
| Actual server API flow | Passed | Local Auth → Next.js API → Database with eight players; duplicate/unauthorized rejection, saved sets/history, protected questions, practice/scored reveal, deadline sync, identity restoration, reviews, team pairing, survey undo, CSV and three-file backup archive |
| Database load | Passed | 200 clients, ten rounds, 2,000/2,000 accepted answers, 40 forced reconnects in round five and 200 unique ranks |
| Local load timings | Recorded | 12,663 ms total, 377 ms median and 928 ms p95 submission receipt, including the forced 800 ms disconnect |
| Initial player transfer | Passed | 280,621 bytes including the 5,282-byte event logo, below the 500 KB target; excludes optional question images and later downloads |
| Browser demo | Passed | Inspected host and 390 × 844 phone layout; start, answer, score and refresh recovery |
| Production Firebase setup | Applied | Database rules published; Anonymous and Email/Password enabled; operator UID verified; production hostname authorised |
| Production base deployment | Passed | Vercel main deployment ready; landing and health endpoints return 200; required configuration is present and host authorization/game creation succeeded |
| Event branding | Built | Supplied logo, optimized flier and event-specific welcome, player, host, projector and offline identity; TypeScript and 22 existing tests pass. Browser preview was declined, so this visual update has not been inspected in a browser |

The production player-flow smoke check stopped on a network fetch failure after host verification. Full production join/answer/result/backup confirmation remains pending; the emulator integration results above are separate from that production check.

The 200-client benchmark measures the local database/rules/receipt path, not production hosting, Auth account creation or venue Wi-Fi. The eight-player API test verifies the real server boundary separately. A 30-phone live deployment test, projector/sound check and venue rehearsal remain required.

The Windows environment needed temporary package-extraction/directory-creation workarounds for EPERM errors. They are outside the repository. Standard npm/lockfile workflows run in CI and on Vercel. Local verification used Node 24/Java 25; CI and deployment target Node 22/Java 21.

Keep the host and projector open for automatic reveal requests. Server deadlines reject late answers even during a complete interruption. Download and test the session's offline HTML before the venue rehearsal. For 200 live connections, verify the Firebase Blaze plan and the event's Auth sign-up quota.
