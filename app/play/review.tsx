"use client";
import { useState } from "react";
import { api } from "@/lib/firebase";
import type { Answer, Question } from "@/lib/game";
import { ErrorNotice } from "../components";
export default function Review({ code }: { code: string }) {
  const [results, setResults] = useState<{
    questions: Question[];
    answers: Record<string, Answer>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setResults(await api("/api/game", { action: "results", code }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="review-section">
      <ErrorNotice message={error} />
      {!results ? (
        <button className="button subtle" disabled={busy} onClick={load}>
          {busy ? "Loading your rounds…" : "Review my answers"}
        </button>
      ) : (
        <>
          <h2>Your game, round by round.</h2>
          <div className="review-list">
            {results.questions.map((q, index) => {
              const answer = results.answers[q.id];
              return (
                <div className="review-card" key={q.id}>
                  <span className="section-label">
                    ROUND {index + 1} ·{" "}
                    {q.type === "survey" ? "SURVEY" : "QUIZ"}
                  </span>
                  <h3>{q.text}</h3>
                  <p
                    className={
                      q.type === "quiz" && answer
                        ? answer.points > 0
                          ? "right"
                          : "wrong"
                        : ""
                    }
                  >
                    Your answer:{" "}
                    <strong>
                      {answer ? q.options[answer.choice] : "No answer recorded"}
                    </strong>
                  </p>
                  {q.type === "quiz" && (
                    <p>
                      Correct answer: <strong>{q.options[q.correct]}</strong> ·{" "}
                      {answer?.points || 0} points
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
