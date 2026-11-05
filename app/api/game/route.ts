import { NextRequest } from "next/server";
import {
  admin,
  identity,
  gameCode,
  payload,
  failure,
  HttpError,
} from "@/lib/admin";
import {
  leaderboard,
  recordAnswer,
  type Player,
  type PublicGame,
  type Question,
} from "@/lib/game";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const uid = await identity(request);
    const body = await payload(request);
    const code = gameCode(body.code);
    const root = admin().db.ref(`games/${code}`);
    const pub = (await root.child("public").get()).val() as PublicGame | null;
    if (!pub)
      throw new HttpError(
        404,
        "Game not found. Check the code with your host.",
      );
    if (body.action === "join") {
      if (
        typeof body.name !== "string" ||
        body.name.trim().length < 2 ||
        body.name.length > 30
      )
        throw new HttpError(400, "Use a name between 2 and 30 characters.");
      const name = body.name.trim();
      const existing = await root.child(`players/${uid}`).get();
      if (existing.exists())
        return Response.json({ code, player: existing.val() });
      if (pub.status !== "lobby")
        throw new HttpError(
          409,
          "This game has already started. Existing players can rejoin on their original browser.",
        );
      const roster = await root
        .child("roster")
        .transaction((current: Record<string, boolean> | null) => {
          const members = current || {};
          if (members[uid]) return members;
          if (Object.keys(members).length >= 200) return;
          return { ...members, [uid]: true };
        });
      if (!roster.committed)
        throw new HttpError(409, "This game has reached its 200-player limit.");
      const result = await root
        .child(`players/${uid}`)
        .transaction(
          (p: Player | null) =>
            p || { name, score: 0, joinedAt: Date.now(), answers: {} },
        );
      // Player count is informational; roster remains the authoritative capacity check.
      const count = (await root.child("roster").get()).numChildren();
      await root.child("public/playerCount").set(count);
      return Response.json({ code, player: result.snapshot.val() });
    }
    if (body.action === "sync") {
      if (!(await root.child(`players/${uid}`).get()).exists())
        throw new HttpError(403, "Join this game first.");
      if (pub.status !== "active" || Date.now() < pub.endsAt + 1500)
        return Response.json({ status: pub.status });
      // Only one request fetches/aggregates the room. A short lease recovers after a server failure.
      const lease = await root
        .child("revealLease")
        .transaction((current: { until: number } | null) =>
          current && current.until > Date.now()
            ? undefined
            : { until: Date.now() + 10000 },
        );
      if (!lease.committed) return Response.json({ status: pub.status });
      const [playersSnap, questionSnap, ownerSnap] = await Promise.all([
        root.child("players").get(),
        root.child(`questions/${pub.round}`).get(),
        root.child("owner").get(),
      ]);
      const players = (playersSnap.val() || {}) as Record<string, Player>;
      const question = questionSnap.val() as Question;
      const counts = question.options.map(
        (_, choice) =>
          Object.values(players).filter(
            (p) => p.answers?.[question.id]?.choice === choice,
          ).length,
      );
      const result = await root
        .child("public")
        .transaction((current: PublicGame | null) => {
          if (!current) return null;
          if (current.status !== "active" || current.round !== pub.round)
            return;
          return {
            ...current,
            status: "reveal",
            correct: question.correct,
            counts,
            leaderboard: leaderboard(players),
            updatedAt: Date.now(),
          };
        });
      if (result.committed && result.snapshot.exists())
        await admin()
          .db.ref(`hosts/${ownerSnap.val()}/rooms/${code}`)
          .update({
            status: "reveal",
            playerCount: Object.keys(players).length,
          });
      return Response.json({ status: "reveal" });
    }
    if (body.action === "results") {
      if (pub.status !== "finished")
        throw new HttpError(
          409,
          "The final review is available after the game ends.",
        );
      const player = (
        await root.child(`players/${uid}`).get()
      ).val() as Player | null;
      if (!player)
        throw new HttpError(
          403,
          "Only players in this game can view their review.",
        );
      const questions = (
        await root.child("questions").get()
      ).val() as Question[];
      return Response.json({
        questions: questions.slice(0, pub.round + 1),
        answers: player.answers || {},
      });
    }
    if (body.action === "answer") {
      const round = body.round;
      if (
        !Number.isInteger(round) ||
        typeof round !== "number" ||
        round < 0 ||
        typeof body.choice !== "number" ||
        !Number.isInteger(body.choice)
      )
        throw new HttpError(400, "Choose a valid answer.");
      const question = (
        await root.child(`questions/${round}`).get()
      ).val() as Question | null;
      if (
        !question ||
        body.choice < 0 ||
        body.choice >= question.options.length
      )
        throw new HttpError(400, "Choose one of the answer options.");
      const playerRef = root.child(`players/${uid}`);
      const old = (await playerRef.child(`answers/${question.id}`).get()).val();
      if (old) return Response.json({ accepted: true, answer: old }); // Safe retries after reveal or timeout.
      const receivedAt = Date.now();
      if (
        pub.status !== "active" ||
        pub.round !== round ||
        receivedAt < pub.startsAt ||
        receivedAt >= pub.endsAt
      )
        throw new HttpError(409, "This round is closed.");
      const choice = body.choice;
      const result = await playerRef.transaction((player: Player | null) =>
        recordAnswer(
          player,
          question,
          choice,
          receivedAt,
          pub.startsAt,
          pub.endsAt,
          Date.now(),
        ),
      );
      if (!result.committed)
        throw new HttpError(
          409,
          "Your answer could not be recorded before the deadline.",
        );
      if (!result.snapshot.exists())
        throw new HttpError(403, "Join the game before answering.");
      return Response.json({
        accepted: true,
        answer: result.snapshot.val().answers[question.id],
      });
    }
    throw new HttpError(400, "Unknown game action.");
  } catch (error) {
    return failure(error);
  }
}
