"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock, LoaderCircle, Trophy } from "lucide-react";
import Review from "./review";
import { ApiError, api, configured, playerAuth } from "@/lib/firebase";
import { useGame, useNow } from "@/lib/use-game";
import {
  Connection,
  ErrorNotice,
  Leaderboard,
  Nav,
  SetupNotice,
  StageLabel,
} from "../components";
import type { Player } from "@/lib/game";
type Pending = {
  code: string;
  round: number;
  questionId: string;
  choice: number;
  expiresAt: number;
  uid: string;
};
export default function Play() {
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uid, setUid] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const sending = useRef(false);
  const {
    game,
    player,
    connected,
    offset,
    error: liveError,
    loading,
  } = useGame(code, true);
  const now = useNow(offset);
  useEffect(() => {
    const query =
      new URLSearchParams(location.search).get("code") ||
      localStorage.getItem("cg.player.code") ||
      "";
    setInputCode(query);
    if (/^\d{6}$/.test(query)) setCode(query);
    setName(localStorage.getItem("cg.player.name") || "");
    if (configured)
      playerAuth()
        .then((user) => {
          setUid(user.uid);
          try {
            const stored = JSON.parse(
              localStorage.getItem(`cg.pending.${user.uid}`) || "null",
            );
            if (stored && stored.uid === user.uid) setPending(stored);
          } catch {
            /* Invalid old cache can be ignored. */
          }
        })
        .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (player) setJoined(true);
    else setJoined(false);
  }, [player]);
  function clearPending() {
    if (uid) localStorage.removeItem(`cg.pending.${uid}`);
    setPending(null);
  }
  useEffect(() => {
    if (!pending || !game || !uid || pending.code !== code) return;
    if (player?.answers?.[pending.questionId]) {
      localStorage.removeItem(`cg.pending.${uid}`);
      setPending(null);
      return;
    }
    // Use server-adjusted time; never award credit to answers received after the deadline.
    if (
      now &&
      (now >= pending.expiresAt ||
        game.round !== pending.round ||
        game.status !== "active")
    ) {
      localStorage.removeItem(`cg.pending.${uid}`);
      setPending(null);
      setError("Your answer was not confirmed before the round closed.");
      return;
    }
    if (!connected || sending.current) return;
    let disposed = false;
    async function send() {
      if (sending.current) return;
      sending.current = true;
      try {
        await api("/api/game", {
          action: "answer",
          code: pending!.code,
          round: pending!.round,
          choice: pending!.choice,
        });
        if (!disposed) {
          localStorage.removeItem(`cg.pending.${uid}`);
          setPending(null);
          setError("");
        }
      } catch (e) {
        if (!disposed) {
          if (
            e instanceof ApiError &&
            e.status >= 400 &&
            e.status < 500 &&
            e.status !== 408 &&
            e.status !== 429
          ) {
            localStorage.removeItem(`cg.pending.${uid}`);
            setPending(null);
            setError(e.message);
          } else
            setError(
              (e as Error).message + " We’ll retry while the round is open.",
            );
        }
      } finally {
        sending.current = false;
      }
    }
    void send();
    const retry = setInterval(() => void send(), 2500);
    return () => {
      disposed = true;
      clearInterval(retry);
    };
  }, [
    pending,
    connected,
    game?.round,
    game?.status,
    player?.answers,
    uid,
    code,
    now >= (pending?.expiresAt || Infinity),
  ]); // eslint-disable-line react-hooks/exhaustive-deps
  const revealDue = !!(game?.status === "active" && now >= game.endsAt + 2000);
  useEffect(() => {
    if (!revealDue || !connected || !player) return;
    let stopped = false;
    let sending = false;
    async function sync() {
      if (stopped || sending) return;
      sending = true;
      try {
        await api("/api/game", { action: "sync", code });
      } catch {
        /* Retry after connectivity recovers. */
      } finally {
        sending = false;
      }
    }
    const initial = setTimeout(() => void sync(), Math.random() * 3000);
    const retry = setInterval(() => void sync(), 12000);
    return () => {
      stopped = true;
      clearTimeout(initial);
      clearInterval(retry);
    };
  }, [revealDue, connected, !!player, code]);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ player: Player }>("/api/game", {
        action: "join",
        code: inputCode,
        name,
      });
      setCode(inputCode);
      setJoined(true);
      setName(result.player.name);
      localStorage.setItem("cg.player.code", inputCode);
      localStorage.setItem("cg.player.name", result.player.name);
      history.replaceState(null, "", `/play?code=${inputCode}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function choose(choice: number) {
    if (
      !game?.question ||
      !uid ||
      pending ||
      !connected ||
      now >= game.endsAt ||
      game.status !== "active" ||
      player?.answers?.[game.question.id]
    )
      return;
    const value: Pending = {
      code,
      round: game.round,
      questionId: game.question.id,
      choice,
      expiresAt: game.endsAt,
      uid,
    };
    localStorage.setItem(`cg.pending.${uid}`, JSON.stringify(value));
    setPending(value);
    setError("");
  }
  const answer = game?.question ? player?.answers?.[game.question.id] : null;
  const seconds = game ? Math.max(0, Math.ceil((game.endsAt - now) / 1000)) : 0;
  const selected =
    answer?.choice ??
    (pending?.code === code && pending.round === game?.round
      ? pending.choice
      : undefined);
  return (
    <>
      <Nav>{joined && <Connection connected={connected} />}</Nav>
      <main className="play-shell">
        <ErrorNotice message={error || liveError} />
        {!configured && <SetupNotice />}
        {!joined ? (
          <div className="join-card">
            <span className="eyebrow">YOUR SEAT IS WAITING</span>
            <h1>
              Get in
              <br />
              <span className="serif">the game.</span>
            </h1>
            <p className="muted">Bring your opinions. Bring your A-game.</p>
            <form onSubmit={join} className="stack">
              <label>
                Game code
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={inputCode}
                  onChange={(e) =>
                    setInputCode(e.target.value.replace(/\D/g, ""))
                  }
                />
              </label>
              <label>
                Your name
                <input
                  required
                  minLength={2}
                  maxLength={30}
                  placeholder="What should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="button lime" disabled={busy || !configured}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <>
                    Let’s play <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
            <p className="small muted">
              Use this browser to keep your place if you reconnect.
            </p>
          </div>
        ) : !game ? (
          <div className="empty-card">
            {loading
              ? "Finding your room…"
              : "This game is no longer available."}
          </div>
        ) : (
          <>
            <div className="room-heading">
              <StageLabel game={game} />
              <span className="muted small">
                {player?.name} · ROOM {code}
              </span>
            </div>
            {game.status === "lobby" ? (
              <div className="waiting-card">
                <div className="pulse-mark">
                  <LoaderCircle size={36} className="spin" />
                </div>
                <h1>
                  You’re in,
                  <br />
                  <span className="serif">{player?.name}.</span>
                </h1>
                <p className="muted">{game.title}</p>
                <div className="waiting-count">
                  <strong>{game.playerCount}</strong> players in the room
                </div>
                <p className="small muted">
                  Your host will start the first round. Keep this screen open.
                </p>
              </div>
            ) : game.status === "finished" ? (
              <>
                <div className="finish-header">
                  <Trophy size={42} />
                  <h1>
                    What a <span className="serif">game.</span>
                  </h1>
                  <p>
                    {game.title} · You scored{" "}
                    <strong>{player?.score.toLocaleString()} points</strong>
                  </p>
                </div>
                <Leaderboard game={game} uid={uid} />
                <Review code={code} />
                <button
                  className="button subtle"
                  onClick={() => {
                    clearPending();
                    setCode("");
                    setInputCode("");
                    setJoined(false);
                    localStorage.removeItem("cg.player.code");
                    history.replaceState(null, "", "/play");
                  }}
                >
                  Join another game <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="question-top">
                  <span className="round-type">
                    {game.question?.type === "survey"
                      ? "YOUR OPINION MATTERS · NO POINTS"
                      : "QUICK THINKING. BIG POINTS."}
                  </span>
                  <span className={`timer ${seconds < 6 ? "urgent" : ""}`}>
                    <Clock size={18} />
                    {seconds}s
                  </span>
                </div>
                <h1 className="question-title">{game.question?.text}</h1>
                <div className="answer-grid">
                  {game.question?.options.map((option, i) => (
                    <button
                      key={i}
                      className={`answer option-${i} ${selected === i ? "selected" : ""} ${game.status === "reveal" && game.correct === i ? "correct" : ""}`}
                      disabled={
                        game.status !== "active" ||
                        seconds === 0 ||
                        selected !== undefined ||
                        !connected
                      }
                      onClick={() => choose(i)}
                    >
                      <span className="option-letter">{"ABCD"[i]}</span>
                      <span>{option}</span>
                      {selected === i && <Check size={20} />}
                    </button>
                  ))}
                </div>
                <div className="answer-status" role="status">
                  {game.status === "reveal"
                    ? game.question?.type === "survey"
                      ? "Thanks for adding your voice."
                      : answer
                        ? `${answer.points > 0 ? "Nice one!" : "On to the next one."} +${answer.points} points`
                        : "No answer recorded for this round."
                    : answer
                      ? "Answer locked in. Waiting for the reveal…"
                      : pending
                        ? "Sending your answer… keep this screen open."
                        : seconds === 0
                          ? "Time’s up. Getting the results ready."
                          : !connected
                            ? "Reconnecting. Answer buttons will unlock when you’re back online."
                            : "One answer. Make it count."}
                </div>
                {game.status === "reveal" && (
                  <>
                    <div className="results-bars">
                      {game.question?.options.map((option, i) => (
                        <div key={i}>
                          <div>
                            <span>{option}</span>
                            <strong>{game.counts?.[i] || 0} votes</strong>
                          </div>
                          <progress
                            max={Math.max(
                              1,
                              game.counts?.reduce((a, b) => a + b, 0) || 0,
                            )}
                            value={game.counts?.[i] || 0}
                          />
                        </div>
                      ))}
                    </div>
                    <Leaderboard game={game} uid={uid} />
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
