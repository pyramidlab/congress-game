# Congress operator runbook

## Choose a game

The host desk creates two independent game types: **Campus quiz** and **Who Wants to Be a Bible Giant**. The survey game has been removed. Existing saved quiz content and results remain available.

## Campus quiz

Edit the quiz questions, correct options, timers, points, campuses and scoring before starting. Players join by PIN on their phones. Start with practice, then run the scored questions and individual/campus leaderboards. Pause, resume, replay or skip as needed. The quiz ends at its podium; it does not select or pair contestants for another game. Export results before deleting a session.

## Who Wants to Be a Bible Giant

1. Select this game type when creating a session. Open its projector display.
2. Enter 2–30 stage player names, one per line, and choose 1–9 starting lives (default three). Save the roster.
3. Review/edit the numbered question pool. A 32-question Bible starter pool is included, with references. JSON question sets and CSV imports are supported. Add enough questions for the event; the host may append more between turns.
4. Start the game. The host operates all controls; stage players do not register on phones and need no previous quiz qualification.
5. Ask the current player to call an unused number, then select it. The question and four answers appear on the projector. Unpicked questions and correct answers remain private.
6. Select the player's proposed answer. The screen asks **Is that your final answer?** Choose another if needed. Only **Yes, final answer** grades the choice.
7. Correct answers preserve lives and increase the correct-answer count. Wrong answers remove one life. A player remains in the game while they have lives. Press **Next player**; turns skip anyone with no lives.
8. Numbers cannot be reused. If the pool is exhausted, append questions from the host controls and continue. The game never selects an arbitrary winner because the pool ran out.
9. When one player remains, show the last result and press **Celebrate winner**. Use Undo turn action to correct an operator mistake before continuing.
10. Export stage results and the turn-by-turn answer history. Verify the automatic backup. End the session before deleting it from Recent games.

Turns are host-paced and untimed. Existing quiz countdown sounds continue to work. Bible Giant has original quiz-show-style question, final-answer, correct-answer, life-loss and winner cues. A quiet suspense background loops while a question or tentative answer is shown, then fades out at the result. Enable sound from the projector's **Sound off** button. In **Sound options**, adjust volume, toggle **Suspense background**, preview the sequence between turns, or download the fourteen-clip WAV pack. Muting stops all playback immediately. Use sound on just one projector tab to avoid echoes, and rehearse with the venue speakers.

## Demos

Quiz: `/host?demo=1&pin=482913`. Bible Giant: `/host?demo=1&pin=482914`. Open the display from the same browser to share demo state. Bible Giant demo includes three sample stage players. Local demo changes do not affect live sessions.

## Offline and connection recovery

- Reopen the same PIN after a host refresh and sign in if required. Game state and tentative answers survive a reconnect. Revision checks protect against two operators making conflicting changes.
- For the phone quiz, reopen the same browser to preserve identity. A Sending answer is not accepted until confirmed. Late reconnection does not extend a deadline. Use correctness-only scoring where connection differences matter.
- Download the offline Bible Giant HTML from its own host dashboard after editing the question pool. It embeds that pool, stage roster, starting lives and the shared rules engine. Open it with Wi-Fi disabled before the event. It has no network or external asset dependencies.
- The offline game works independently: enter/review the roster, pick numbers, confirm final answers, lose lives, rotate players, undo mistakes and celebrate the winner. Import extra question-set JSON between turns if needed. Export its JSON results. It does not sync offline changes into an online game.
- Keep a spare laptop, a manual result export and an organiser-approved question pool. Rehearse the actual projector, sound and venue network. For 200 phone-quiz connections, verify Firebase Blaze and the venue's Auth sign-up quota; do a real-phone rehearsal.
