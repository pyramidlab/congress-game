export type Question = {
  id: string;
  text: string;
  options: string[];
  correct: number;
  seconds: number;
  type: "quiz" | "survey";
};
export type PublicGame = {
  title: string;
  code: string;
  status: "lobby" | "active" | "reveal" | "finished";
  round: number;
  total: number;
  question: Omit<Question, "correct"> | null;
  startsAt: number;
  endsAt: number;
  correct: number | null;
  counts: number[];
  leaderboard: { uid: string; name: string; score: number; rank: number }[];
  playerCount: number;
  updatedAt: number;
};
export type Answer = { choice: number; receivedAt: number; points: number };
export type Player = {
  name: string;
  score: number;
  joinedAt: number;
  answers: Record<string, Answer>;
};
export function pointsFor(
  question: Question,
  choice: number,
  receivedAt: number,
  startsAt: number,
  endsAt: number,
) {
  if (question.type === "survey" || choice !== question.correct) return 0;
  const fraction = Math.min(
    1,
    Math.max(0, (endsAt - receivedAt) / (endsAt - startsAt)),
  );
  return 500 + Math.round(500 * fraction);
}
export function validateQuestions(input: unknown): Question[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100)
    throw new Error("Add between 1 and 100 questions.");
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object")
      throw new Error(`Question ${index + 1} is invalid.`);
    const q = raw as Record<string, unknown>;
    if (typeof q.text !== "string" || !q.text.trim() || q.text.length > 500)
      throw new Error(
        `Question ${index + 1} needs a prompt (maximum 500 characters).`,
      );
    if (
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 4 ||
      q.options.some(
        (o) => typeof o !== "string" || !o.trim() || o.length > 200,
      )
    )
      throw new Error("Use 2–4 non-empty options, each under 200 characters.");
    if (
      new Set(q.options.map((o) => (o as string).trim().toLowerCase())).size !==
      q.options.length
    )
      throw new Error("Answer options must be different.");
    if (q.type !== "quiz" && q.type !== "survey")
      throw new Error("Select quiz or survey.");
    if (
      typeof q.seconds !== "number" ||
      !Number.isInteger(q.seconds) ||
      q.seconds < 10 ||
      q.seconds > 180
    )
      throw new Error("Round time must be 10–180 seconds.");
    if (
      q.type === "quiz" &&
      (typeof q.correct !== "number" ||
        !Number.isInteger(q.correct) ||
        q.correct < 0 ||
        q.correct >= q.options.length)
    )
      throw new Error("Choose a correct answer.");
    return {
      id: `q${index + 1}`,
      text: q.text.trim(),
      options: q.options.map((o) => (o as string).trim()),
      correct: q.type === "survey" ? -1 : (q.correct as number),
      seconds: q.seconds,
      type: q.type,
    };
  });
}
export function leaderboard(players: Record<string, Player>) {
  const sorted = Object.entries(players)
    .map(([uid, p]) => ({ uid, name: p.name, score: p.score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.name.localeCompare(b.name) ||
        a.uid.localeCompare(b.uid),
    );
  return sorted.map((p, i) => ({
    ...p,
    rank:
      i > 0 && p.score === sorted[i - 1].score
        ? sorted.findIndex((x) => x.score === p.score) + 1
        : i + 1,
  }));
}
export const demoQuestions: Question[] = [
  {
    id: "q1",
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct: 1,
    seconds: 20,
    type: "quiz",
  },
  {
    id: "q2",
    text: "What is the capital of Nigeria?",
    options: ["Lagos", "Akure", "Abuja", "Kano"],
    correct: 2,
    seconds: 20,
    type: "quiz",
  },
  {
    id: "q3",
    text: "What should we do more of at the next congress?",
    options: ["Games", "Workshops", "Networking", "Music"],
    correct: -1,
    seconds: 30,
    type: "survey",
  },
];

// One transaction owns both an answer receipt and its score; repeats are a no-op.
export function recordAnswer(
  player: Player | null,
  question: Question,
  choice: number,
  receivedAt: number,
  startsAt: number,
  endsAt: number,
  commitAt: number,
): Player | null | undefined {
  if (!player) return null;
  if (player.answers?.[question.id]) return player;
  if (receivedAt < startsAt || receivedAt >= endsAt || commitAt >= endsAt)
    return undefined;
  const points = pointsFor(question, choice, receivedAt, startsAt, endsAt);
  return {
    ...player,
    score: player.score + points,
    answers: {
      ...player.answers,
      [question.id]: { choice, points, receivedAt },
    },
  };
}
