# Operator runbook

## Before the event

- Connect Firebase and deploy the frontend using SETUP.md. Test a host account, a second operator and automatic question reveal.
- Replace all sample quiz questions. Use the question CSV template in the host dashboard or enter questions manually. Confirm the correct options, one practice question, ten scored questions, time limits and base points.
- Check campus names and the number of top players used for campus totals. Review the eight starter survey rankings with the organisers and replace them if needed.
- Create the event. Changes are allowed in the lobby, then locked. Keep the PIN and host account ready on the spare laptop.
- Download the offline board **from this session's host dashboard** after the survey edits. Open the downloaded HTML with Wi-Fi disconnected, and check the question list. Keep a manual results export as well.
- Test at least 30 physical phones through ten questions, including refreshing and reopening the same browser. A second browser or cleared storage is a new identity. Test duplicate names, pause, replay and the campus board. Confirm the Auth quota for a shared venue IP.
- Rehearse on the actual network with slow/dropped connections. A sending answer is not accepted until the phone says locked in. Server receipt determines speed; use longer question times or accuracy scoring if network differences dominate. Score mode is chosen before starting.
- Check QR scanning, 16:9 projector readability from the back, sound opt-in/mute and a spare hotspot. Select the display's contrast mode that works best on the projector.

## The one-hour show

1. **8 minutes lobby + 1 minute practice:** project `/display?pin=PIN`. Share the QR and short link. Host operates `/host?pin=PIN` in a different window. Start once the room is ready. Practice awards no points.
2. **14 minutes quiz:** reveal at the deadline, explain the answer, show the leaderboard, then continue. Campus totals default on the leaderboard after scored questions 5 and 10; the host can select players or campuses explicitly. Keep roughly 80 seconds per question including explanation.
3. **5 minutes top eight:** announce the podium and eight finalists. Pair 1+8, 2+7, 3+6, 4+5. Open team review to replace absent players by name and edit team names before starting showdown.
4. **16 minutes semi-finals:** Team 1 vs 4, then Team 2 vs 3. Use surveys 1–2 and 3–4 respectively, two rounds per match at 1×. Host chooses control after the face-off, flips accepted answers, and adds strikes. At three strikes give the other team one spoken steal attempt. Award the revealed round points once to the winner. Load the next survey. Advance only after the second round.
5. **10 minutes final:** winners play surveys 5–7 at 1×, 2× and 3×. Load each survey after awarding the previous one. If totals tie, load the spare sudden-death survey, hear both answers, reveal the host-selected winner's accepted answer and award that round. Advance to celebrate.
6. **5 minutes celebration + 1 minute buffer:** announce the winning pair and campus. Export both result CSVs, and verify the backup success notice.

## Recovery

- **One player disconnects:** ask them to reopen the same browser and link. Their score and membership return. Do not accept a second username as a replacement for their identity.
- **Many players lose the question:** pause if the timer is running. Replay the question after connectivity returns; replay voids the previous attempt and its points for everyone. Use a fresh attempt, never manually add points from cached answers.
- **Host refreshes:** reopen the same PIN and sign in if required. State is in Firebase. Two operators should coordinate verbally; stale commands are rejected rather than overwriting each other.
- **Timer reaches zero without reveal:** late answers are still blocked. Use manual reveal and check that the host/display remain connected.
- **Host misclicks:** survey Undo restores the previous board and scores. Manual match-total correction is available. A quiz replay discards the entire current attempt; a skip discards it and advances.
- **Internet/server outage:** stop the phone quiz. Keep the current online score export if available. Open the downloaded offline board, name the teams, run surveys manually and export its JSON match record. It works without internet; it does not update the live bracket or online scores. Use a written bracket and the score correction controls as needed.
- **Backup failure:** download manual player and campus CSVs immediately. The host shows backup status; database results still exist independently of the backup files.

Do not clear browser storage during the event. Keep a second operator, a charged spare device, the offline HTML and a written run of show available.
