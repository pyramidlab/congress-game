"use client";
import Link from "next/link";
import { ArrowUpRight, Radio, Trophy, Wifi, WifiOff, Zap } from "lucide-react";
import type { PublicGame } from "@/lib/game";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-icon">
        <Zap size={19} fill="currentColor" />
      </span>
      congress<span className="brand-light">game</span>
      <span className="brand-dot">.</span>
    </Link>
  );
}
export function Nav({ children }: { children?: React.ReactNode }) {
  return (
    <header className="nav">
      <Brand />
      <div className="nav-right">
        {children || (
          <Link href="/host" className="text-link">
            Host a game <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </header>
  );
}
export function Connection({ connected }: { connected: boolean }) {
  return (
    <span className={`connection ${connected ? "" : "offline"}`} role="status">
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {connected ? "Live connection" : "Reconnecting…"}
    </span>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
    </div>
  ) : null;
}
export function SetupNotice() {
  return (
    <div className="notice">
      <strong>One quick setup before we play.</strong>
      <p>
        Connect Firebase and add a host account using the repository’s setup
        guide. This screen is ready; live games become available once connected.
      </p>
    </div>
  );
}
export function Leaderboard({ game, uid }: { game: PublicGame; uid?: string }) {
  return (
    <div className="leaderboard">
      <div className="section-label">
        <Trophy size={16} /> THE LEADERBOARD
      </div>
      {!game.leaderboard?.length ? (
        <p className="muted">The first round will put names on the board.</p>
      ) : (
        game.leaderboard.map((p) => (
          <div className={`rank-row ${p.uid === uid ? "you" : ""}`} key={p.uid}>
            <span className="rank">{p.rank < 10 ? `0${p.rank}` : p.rank}</span>
            <span className="avatar">{p.name[0]?.toUpperCase()}</span>
            <strong>
              {p.name}
              {p.uid === uid && <small> YOU</small>}
            </strong>
            <span className="score">
              {p.score.toLocaleString()} <small>pts</small>
            </span>
          </div>
        ))
      )}
    </div>
  );
}
export function StageLabel({ game }: { game: PublicGame }) {
  return (
    <span className="eyebrow">
      <Radio size={13} />
      {game.status === "lobby"
        ? "THE ROOM IS OPEN"
        : game.status === "finished"
          ? "THAT’S A WRAP"
          : `ROUND ${game.round + 1} OF ${game.total} · ${game.question?.type === "survey" ? "SURVEY" : "QUIZ"}`}
    </span>
  );
}
