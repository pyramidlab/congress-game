import { randomInt } from "node:crypto";
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
  validateQuestions,
  type PublicGame,
  type Player,
  type Question,
} from "@/lib/game";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const uid = await identity(request, true);
    const body = await payload(request);
    const db = admin().db;
    if (body.action === "check") return Response.json({ host: true });
    if (body.action === "list") {
      const rooms =
        (
          await db
            .ref(`hosts/${uid}/rooms`)
            .orderByChild("createdAt")
            .limitToLast(50)
            .get()
        ).val() || {};
      return Response.json({
        rooms: Object.values(rooms).sort(
          (a, b) =>
            (b as { createdAt: number }).createdAt -
            (a as { createdAt: number }).createdAt,
        ),
      });
    }
    if (body.action === "templates") {
      const templates =
        (await db.ref(`hosts/${uid}/templates`).get()).val() || {};
      return Response.json({
        templates: Object.entries(templates).map(([id, template]) => ({
          ...(template as object),
          id,
        })),
      });
    }
    if (body.action === "save-template") {
      if (
        typeof body.title !== "string" ||
        !body.title.trim() ||
        body.title.length > 80
      )
        throw new HttpError(400, "Give this question set a title.");
      let questions: Question[];
      try {
        questions = validateQuestions(body.questions);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      const ref = db.ref(`hosts/${uid}/templates`).push();
      await ref.set({
        title: body.title.trim(),
        questions,
        createdAt: Date.now(),
      });
      return Response.json({ id: ref.key });
    }
    if (body.action === "delete-template") {
      if (typeof body.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(body.id))
        throw new HttpError(400, "Invalid question set.");
      await db.ref(`hosts/${uid}/templates/${body.id}`).remove();
      return Response.json({ success: true });
    }
    if (body.action === "create") {
      if (
        typeof body.title !== "string" ||
        !body.title.trim() ||
        body.title.length > 80
      )
        throw new HttpError(
          400,
          "Give your game a title (maximum 80 characters).",
        );
      let questions: Question[];
      try {
        questions = validateQuestions(body.questions);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = String(randomInt(100000, 1000000));
        const now = Date.now();
        const pub: PublicGame = {
          code,
          title: body.title.trim(),
          status: "lobby",
          total: questions.length,
          round: -1,
          question: null,
          startsAt: 0,
          endsAt: 0,
          correct: null,
          counts: [],
          leaderboard: [],
          playerCount: 0,
          updatedAt: now,
        };
        const result = await db
          .ref(`games/${code}`)
          .transaction((current) =>
            current
              ? undefined
              : { owner: uid, createdAt: now, questions, public: pub },
          );
        if (result.committed) {
          await db
            .ref(`hosts/${uid}/rooms/${code}`)
            .set({
              code,
              title: pub.title,
              createdAt: now,
              total: questions.length,
              status: "lobby",
              playerCount: 0,
            });
          return Response.json({ code });
        }
      }
      throw new HttpError(503, "Could not reserve a game code. Try again.");
    }
    const code = gameCode(body.code);
    const root = db.ref(`games/${code}`);
    if ((await root.child("owner").get()).val() !== uid)
      throw new HttpError(403, "Only the host of this game can control it.");
    const [publicSnap, playersSnap, questionsSnap] = await Promise.all([
      root.child("public").get(),
      root.child("players").get(),
      root.child("questions").get(),
    ]);
    const pub = publicSnap.val() as PublicGame;
    const players = (playersSnap.val() || {}) as Record<string, Player>;
    const questions = questionsSnap.val() as Question[];
    if (body.action === "load")
      return Response.json({ title: pub.title, questions });
    const ranking = leaderboard(players);
    const counts =
      pub.question?.options.map(
        (_, choice) =>
          Object.values(players).filter(
            (p) => p.answers?.[pub.question!.id]?.choice === choice,
          ).length,
      ) || [];
    if (body.action === "summary")
      return Response.json({
        answerCount: counts.reduce((a, b) => a + b, 0),
        playerCount: Object.keys(players).length,
      });
    if (body.action === "export") {
      return Response.json({
        title: pub.title,
        questions,
        players: ranking.map((p) => ({
          ...p,
          answers: players[p.uid].answers || {},
        })),
      });
    }
    const now = Date.now();
    const result = await root
      .child("public")
      .transaction((current: PublicGame | null) => {
        if (!current) return null;
        if (current.status !== pub.status || current.round !== pub.round)
          return;
        const base = {
          ...current,
          updatedAt: now,
          playerCount: Object.keys(players).length,
        };
        if (body.action === "start" || body.action === "next") {
          if (
            (body.action === "start" && current.status !== "lobby") ||
            (body.action === "next" && current.status !== "reveal")
          )
            return;
          const next = current.round + 1;
          if (next >= questions.length)
            return { ...base, status: "finished", leaderboard: ranking };
          if (Object.keys(players).length === 0) return;
          const { correct: _correct, ...question } = questions[next];
          return {
            ...base,
            round: next,
            status: "active",
            startsAt: now,
            endsAt: now + question.seconds * 1000,
            question,
            correct: null,
            counts: [],
            leaderboard: ranking,
          };
        }
        if (body.action === "reveal" && current.status === "active") {
          // Avoid scoring a request already being accepted while a host closes a round.
          if (now < current.endsAt + 1500) return;
          return {
            ...base,
            status: "reveal",
            correct: questions[current.round].correct,
            counts,
            leaderboard: ranking,
          };
        }
        if (
          body.action === "finish" &&
          (current.status === "lobby" || current.status === "reveal")
        )
          return { ...base, status: "finished", leaderboard: ranking };
        return;
      });
    if (!result.committed || !result.snapshot.exists())
      throw new HttpError(
        409,
        "This action is not available yet. Wait for the timer, or refresh the game.",
      );
    await db
      .ref(`hosts/${uid}/rooms/${code}`)
      .update({
        status: result.snapshot.val().status,
        playerCount: Object.keys(players).length,
      });
    return Response.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
