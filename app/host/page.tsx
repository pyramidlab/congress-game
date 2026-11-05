"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HostLibrary from "./library";
import DraftTools from "./draft-tools";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import QRCode from "qrcode";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  LogOut,
  Play,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { ApiError, api, configured, services } from "@/lib/firebase";
import { demoQuestions, type Question } from "@/lib/game";
import { useGame, useNow } from "@/lib/use-game";
import {
  Connection,
  ErrorNotice,
  Leaderboard,
  Nav,
  SetupNotice,
  StageLabel,
} from "../components";
export default function Host() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("The Congress Challenge");
  const [questions, setQuestions] = useState<Question[]>(demoQuestions);
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [answerCount, setAnswerCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [recovery, setRecovery] = useState("");
  const revealing = useRef(false);
  const lastRevealAttempt = useRef(0);
  const {
    game,
    connected,
    offset,
    error: liveError,
  } = useGame(authed ? code : "");
  const now = useNow(offset);
  useEffect(() => {
    if (!configured) return;
    let stopped = false;
    services()
      .auth.authStateReady()
      .then(async () => {
        if (services().auth.currentUser?.isAnonymous === false) {
          try {
            await api("/api/host", { action: "check" });
            if (!stopped) {
              setAuthed(true);
              setCode(localStorage.getItem("cg.host.code") || "");
            }
          } catch {
            /* Sign-in form handles a non-host account. */
          }
        }
      });
    try {
      const draft = JSON.parse(localStorage.getItem("cg.host.draft") || "null");
      if (draft) {
        setTitle(draft.title);
        setQuestions(draft.questions);
      }
    } catch {
      /* Keep example questions. */
    }
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    if (authed)
      localStorage.setItem(
        "cg.host.draft",
        JSON.stringify({ title, questions }),
      );
  }, [title, questions, authed]);
  useEffect(() => {
    if (!code) return;
    const joinUrl = `${location.origin}/play?code=${code}`;
    setUrl(joinUrl);
    let stopped = false;
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#18352a", light: "#ffffff" },
    }).then((value) => {
      if (!stopped) setQr(value);
    });
    return () => {
      stopped = true;
    };
  }, [code]);
  useEffect(() => {
    if (!authed || !code || game?.status !== "active") return;
    let stopped = false;
    let polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      try {
        const result = await api<{ answerCount: number }>("/api/host", {
          action: "summary",
          code,
        });
        if (!stopped) setAnswerCount(result.answerCount);
      } catch {
        /* Live connectivity indicator shows network issues. */
      } finally {
        polling = false;
      }
    }
    setAnswerCount(0);
    void poll();
    const interval = setInterval(() => void poll(), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [authed, code, game?.status, game?.round]);
  useEffect(() => {
    if (
      !game ||
      game.status !== "active" ||
      !connected ||
      now < game.endsAt + 1800 ||
      revealing.current ||
      Date.now() - lastRevealAttempt.current < 3000
    )
      return;
    revealing.current = true;
    lastRevealAttempt.current = Date.now();
    api("/api/host", { action: "reveal", code })
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 409)) setError(e.message);
      })
      .finally(() => {
        revealing.current = false;
      });
  }, [game, now, connected, code]);
  async function resetPassword() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(services().auth, email.trim());
      setMessage(
        "If this email has an account, a password reset link is on its way.",
      );
    } catch {
      setError(
        "The reset email could not be requested. Check your connection and email address.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(services().auth, email, password);
      await api("/api/host", { action: "check" });
      setAuthed(true);
      setPassword("");
      setCode(localStorage.getItem("cg.host.code") || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(action: string) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ code: string }>("/api/host", {
        action,
        code,
        title,
        questions,
      });
      if (action === "create") {
        setCode(result.code);
        localStorage.setItem("cg.host.code", result.code);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, direction: number) {
    setQuestions((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function edit(index: number, patch: Partial<Question>) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        title: string;
        questions: Question[];
        players: {
          name: string;
          rank: number;
          score: number;
          answers: Record<string, { choice: number; points: number }>;
        }[];
      }>("/api/host", { action: "export", code });
      const cell = (value: string | number) =>
        '"' +
        String(value)
          .replace(/^[=+@\-\t\r]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const rows: (string | number)[][] = [
        [
          "Rank",
          "Player",
          "Score",
          ...data.questions.flatMap((q) => [q.text, `${q.id} points`]),
        ],
        ...data.players.map((p) => [
          p.rank,
          p.name,
          p.score,
          ...data.questions.flatMap((q) => [
            q.options[p.answers[q.id]?.choice] || "No answer",
            p.answers[q.id]?.points ?? 0,
          ]),
        ]),
      ];
      const blob = new Blob(
        ["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      );
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `congress-${code}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Nav>
        {authed ? (
          <button
            className="text-link"
            onClick={async () => {
              await signOut(services().auth);
              setAuthed(false);
              setCode("");
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        ) : (
          <Link href="/play" className="text-link">
            I’m here to play <ArrowRight size={16} />
          </Link>
        )}
      </Nav>
      <main className="host-shell">
        <ErrorNotice message={error || liveError} />
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {!configured && <SetupNotice />}
        {!authed ? (
          <div className="join-card">
            <span className="eyebrow">FOR THE PERSON RUNNING THE SHOW</span>
            <h1>
              Your room.
              <br />
              <span className="serif">Your rules.</span>
            </h1>
            <p className="muted">Sign in with your authorised host account.</p>
            <form onSubmit={login} className="stack">
              <label>
                Email address
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="button lime" disabled={busy || !configured}>
                {busy ? "Signing in…" : "Enter the control room"}
                <ArrowRight size={18} />
              </button>
            </form>
            <button
              className="text-link"
              disabled={busy || !configured}
              onClick={resetPassword}
            >
              Forgot your password?
            </button>
          </div>
        ) : !code ? (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">THE CONTROL ROOM</span>
                <h1>
                  Make it <span className="serif">a moment.</span>
                </h1>
                <p className="muted">
                  Build your rounds. Open the room. Let everyone join in.
                </p>
              </div>
              <button
                className="button lime"
                disabled={busy}
                onClick={() => action("create")}
              >
                Open the room <ArrowRight size={18} />
              </button>
            </div>
            <section className="panel">
              <label className="title-field">
                Name your game
                <input
                  maxLength={80}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <div className="editor-meta">
                <span>{questions.length} ROUNDS · UP TO 200 PLAYERS</span>
                <button
                  className="text-link"
                  onClick={() => {
                    if (
                      confirm(
                        "Replace your current draft with the three sample rounds?",
                      )
                    )
                      setQuestions(demoQuestions);
                  }}
                >
                  Load sample rounds
                </button>
              </div>
            </section>
            <DraftTools
              title={title}
              questions={questions}
              onLoad={(t, qs) => {
                setTitle(t);
                setQuestions(qs);
              }}
            />
            <div className="question-editor">
              {questions.map((q, index) => (
                <section className="panel editor-question" key={index}>
                  <div className="editor-question-head">
                    <span className="section-label">
                      ROUND {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="row">
                      <button
                        className="icon-button"
                        disabled={index === 0}
                        aria-label={`Move round ${index + 1} up`}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="icon-button"
                        disabled={index === questions.length - 1}
                        aria-label={`Move round ${index + 1} down`}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <select
                        aria-label={`Round ${index + 1} type`}
                        value={q.type}
                        onChange={(e) =>
                          edit(index, {
                            type: e.target.value as Question["type"],
                            correct: e.target.value === "survey" ? -1 : 0,
                          })
                        }
                      >
                        <option value="quiz">Scored quiz</option>
                        <option value="survey">Live survey</option>
                      </select>
                      <button
                        className="icon-button"
                        aria-label={`Remove round ${index + 1}`}
                        disabled={questions.length === 1}
                        onClick={() =>
                          setQuestions((qs) => qs.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <label>
                    Question
                    <textarea
                      maxLength={500}
                      value={q.text}
                      onChange={(e) => edit(index, { text: e.target.value })}
                    />
                  </label>
                  <div className="editor-options">
                    {q.options.map((option, oi) => (
                      <label
                        key={oi}
                        className={
                          q.type === "quiz" && q.correct === oi
                            ? "correct-option"
                            : ""
                        }
                      >
                        <span className="option-letter">{"ABCD"[oi]}</span>
                        <input
                          aria-label={`Round ${index + 1} option ${"ABCD"[oi]}`}
                          maxLength={200}
                          value={option}
                          onChange={(e) =>
                            edit(index, {
                              options: q.options.map((v, i) =>
                                i === oi ? e.target.value : v,
                              ),
                            })
                          }
                        />
                        {q.type === "quiz" && (
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            aria-label={`Mark ${"ABCD"[oi]} as correct for round ${index + 1}`}
                            checked={q.correct === oi}
                            onChange={() => edit(index, { correct: oi })}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="row option-tools">
                    <button
                      className="text-link"
                      disabled={q.options.length >= 4}
                      onClick={() =>
                        edit(index, { options: [...q.options, ""] })
                      }
                    >
                      Add option
                    </button>
                    <button
                      className="text-link"
                      disabled={q.options.length <= 2}
                      onClick={() =>
                        edit(index, {
                          options: q.options.slice(0, -1),
                          correct:
                            q.correct >= q.options.length - 1 ? 0 : q.correct,
                        })
                      }
                    >
                      Remove last option
                    </button>
                  </div>
                  <div className="editor-bottom">
                    <span className="small muted">
                      {q.type === "quiz"
                        ? "Select the circle beside the correct answer."
                        : "Surveys collect opinions and award no points."}
                    </span>
                    <label className="duration">
                      Time limit{" "}
                      <select
                        value={q.seconds}
                        onChange={(e) =>
                          edit(index, { seconds: Number(e.target.value) })
                        }
                      >
                        {[10, 15, 20, 30, 45, 60, 90, 120, 180].map((v) => (
                          <option key={v} value={v}>
                            {v}s
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
              ))}
            </div>
            <button
              className="button subtle"
              disabled={questions.length >= 100}
              onClick={() =>
                setQuestions((qs) => [
                  ...qs,
                  {
                    id: `q${qs.length + 1}`,
                    text: "",
                    options: ["", "", "", ""],
                    correct: 0,
                    seconds: 30,
                    type: "quiz",
                  },
                ])
              }
            >
              <Plus size={18} /> Add a round
            </button>
            <HostLibrary
              draft={{ title, questions }}
              onLoad={(draft) => {
                setTitle(draft.title);
                setQuestions(draft.questions);
              }}
              onOpen={(value) => {
                setCode(value);
                localStorage.setItem("cg.host.code", value);
              }}
            />
            <form
              className="recovery-form row"
              onSubmit={(e) => {
                e.preventDefault();
                setCode(recovery);
                localStorage.setItem("cg.host.code", recovery);
              }}
            >
              <label className="small muted" htmlFor="recover">
                Reopen a room
              </label>
              <input
                id="recover"
                placeholder="Game code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={recovery}
                onChange={(e) => setRecovery(e.target.value.replace(/\D/g, ""))}
              />
              <button className="button subtle">Open</button>
            </form>
          </>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">THE CONTROL ROOM</span>
                <h1>{game?.title || "Loading your room…"}</h1>
              </div>
              <Connection connected={connected} />
            </div>
            <div className="host-grid">
              <section className="panel room-card">
                <span className="section-label">SCAN IN. GAME ON.</span>
                {qr && (
                  <img
                    className="qr"
                    src={qr}
                    alt={`QR code to join game ${code}`}
                    width={200}
                    height={200}
                  />
                )}
                <span className="muted small">OR ENTER THIS GAME CODE</span>
                <strong className="game-code">{code}</strong>
                <button
                  className="text-link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      setError(`Copy this link: ${url}`);
                    }
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Link copied" : "Copy join link"}
                </button>
                <Link
                  target="_blank"
                  href={`/display?code=${code}`}
                  className="button subtle"
                >
                  Open big screen <ExternalLink size={15} />
                </Link>
              </section>
              <section className="panel host-stage">
                {game ? (
                  <>
                    <StageLabel game={game} />
                    {game.status === "lobby" ? (
                      <>
                        <h2>
                          The room
                          <br />
                          is <span className="serif">yours.</span>
                        </h2>
                        <p className="muted">
                          Share the code and wait for your people.
                        </p>
                        <div className="host-count">
                          <Users size={24} />
                          <strong>{game.playerCount}</strong>
                          <span>/ 200 players</span>
                        </div>
                        <button
                          className="button lime"
                          disabled={
                            busy || !connected || game.playerCount === 0
                          }
                          onClick={() => action("start")}
                        >
                          <Play size={17} /> Start the game
                        </button>
                      </>
                    ) : game.status === "finished" ? (
                      <>
                        <h2>
                          That’s a <span className="serif">wrap.</span>
                        </h2>
                        <p className="muted">The final standings are ready.</p>
                        <button
                          className="button lime"
                          onClick={download}
                          disabled={busy}
                        >
                          <Download size={17} /> Export results
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 className="host-question">{game.question?.text}</h2>
                        <div className="host-timer">
                          {Math.max(0, Math.ceil((game.endsAt - now) / 1000))}
                          <span>seconds left</span>
                        </div>
                        <p className="muted">
                          {game.status === "active"
                            ? answerCount
                            : game.counts?.reduce((a, b) => a + b, 0) || 0}{" "}
                          / {game.playerCount} answers received
                        </p>
                        {game.status === "reveal" ? (
                          <>
                            <p className="notice">
                              {game.question?.type === "survey"
                                ? "Survey results are on screen."
                                : `Correct answer: ${game.question?.options[game.correct ?? -1]}`}
                            </p>
                            <button
                              className="button lime"
                              disabled={busy || !connected}
                              onClick={() => action("next")}
                            >
                              {game.round + 1 >= game.total
                                ? "Show final standings"
                                : "Next round"}
                              <ArrowRight size={18} />
                            </button>
                          </>
                        ) : (
                          <p className="small muted">
                            Results reveal automatically after the timer ends.
                            Keep the control room open.
                          </p>
                        )}
                      </>
                    )}
                    {(game.status === "lobby" || game.status === "reveal") && (
                      <button
                        className="text-link end-game"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              "End this game and show the final standings?",
                            )
                          )
                            void action("finish");
                        }}
                      >
                        End game
                      </button>
                    )}
                  </>
                ) : (
                  <p className="muted">
                    Connecting… If this room cannot be found, return to your
                    draft and reopen the correct game code.
                  </p>
                )}
              </section>
            </div>
            {game && <Leaderboard game={game} />}
            {game && (
              <button
                className="button subtle"
                onClick={() => {
                  setCode("");
                  localStorage.removeItem("cg.host.code");
                }}
              >
                Back to game library
              </button>
            )}
            {game?.status === "finished" && (
              <button
                className="button subtle"
                onClick={() => {
                  setCode("");
                  localStorage.removeItem("cg.host.code");
                }}
              >
                Create another game <Plus size={17} />
              </button>
            )}
            {!game && (
              <button
                className="button subtle"
                onClick={() => {
                  setCode("");
                  localStorage.removeItem("cg.host.code");
                }}
              >
                Back to draft
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
