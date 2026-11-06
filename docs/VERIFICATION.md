# Verification — 5 November 2026

The final architecture is phone/host/projector → Next.js server routes on Vercel → Firebase Auth and Realtime Database. Answer receipt goes directly through strict Firebase rules and server timestamps; server routes compute scores and control the board.

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript and production build | Passed | Frontend, shared engine and server routes; all app/API routes built |
| Engine, CSV, restore, audio and host access | Passed | Quiz scoring, ties, campus totals, replay, paused time, imports, omitted Firebase collections, host UID allowlist, sound timing, plus independent Bible Giant roster/lives, number selection, final confirmation, private answers, turn rotation, undo and last-player winner |
| Database rules | Passed | 8 emulator tests: private answers, first write, forged timestamps, invalid choices, old/paused/expired attempts, score protection and private libraries |
| Actual server API flow | Passed | Local Auth → Next.js API → Database with eight quiz players, saved sets/history, protected answers, practice/scored reveal, reviews, creator-only deletion and concurrent join cleanup. Independent Bible Giant creation, host-only actions, no phone registration, hidden correct answers until final confirmation, life loss, winner, CSV and private backups also pass |
| Database load | Passed | 200 clients, ten rounds, 2,000/2,000 accepted answers, 40 forced reconnects in round five and 200 unique ranks |
| Local load timings | Recorded | 12,663 ms total, 377 ms median and 928 ms p95 submission receipt, including the forced 800 ms disconnect |
| Initial player transfer | Passed | About 285 KB including the 5,282-byte event logo, below the 500 KB target; excludes optional images and later downloads |
| Browser demo | Passed | Inspected host and 390 × 844 phone layout; start, answer, score and refresh recovery |
| Production Firebase setup | Applied | Database rules published; Anonymous and Email/Password enabled; operator UID verified; production hostname authorised |
| Production base deployment | Passed | Vercel main deployment ready; landing and health endpoints return 200; required configuration is present and host authorization/game creation succeeded |
| Event branding | Built | Supplied logo, optimized flier and event-specific welcome, player, host, projector and offline identity; TypeScript and 22 existing tests pass. Browser preview was declined, so this visual update has not been inspected in a browser |

The production player-flow smoke check stopped on a network fetch failure after host verification. Full production join/answer/result/backup confirmation remains pending; the emulator integration results above are separate from that production check.

The 200-client benchmark measures the local database/rules/receipt path, not production hosting, Auth account creation or venue Wi-Fi. The eight-player API test verifies the real server boundary separately. A 30-phone live deployment test, projector/sound check and venue rehearsal remain required.

The Windows environment needed temporary package-extraction/directory-creation workarounds for EPERM errors. They are outside the repository. Standard npm/lockfile workflows run in CI and on Vercel. Local verification used Node 24/Java 25; CI and deployment target Node 22/Java 21.

Keep the host and projector open for automatic reveal requests. Server deadlines reject late answers even during a complete interruption. Download and test the session's offline HTML before the venue rehearsal. For 200 live connections, verify the Firebase Blaze plan and the event's Auth sign-up quota.

The survey and seeded-team stages have been replaced by a separate, host-led **Who Wants to Be a Bible Giant** game type. Quiz and Bible Giant have independent demo rooms (482913 and 482914). The generated offline Bible Giant HTML embeds the same TypeScript rules as the server; executing its compiled runtime verified final-answer confirmation, life loss and the last-player winner. This new interface has build/type checks and emulator integration coverage; browser automation remains blocked by the saved access setting, so a manual projector rehearsal is still needed.
