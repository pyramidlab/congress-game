"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Users } from "lucide-react";
import { useGame, useNow } from "@/lib/use-game";
import {
  Connection,
  ErrorNotice,
  Leaderboard,
  Nav,
  StageLabel,
} from "../components";
export default function Display() {
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const { game, connected, offset, error, loading } = useGame(code);
  const now = useNow(offset);
  useEffect(() => {
    const value = new URLSearchParams(location.search).get("code") || "";
    setCode(value);
    if (/^\d{6}$/.test(value))
      QRCode.toDataURL(`${location.origin}/play?code=${value}`, {
        width: 400,
        margin: 2,
      }).then(setQr);
  }, []);
  return (
    <>
      <Nav>
        <Connection connected={connected} />
      </Nav>
      <main className="display-shell">
        <ErrorNotice message={error} />
        {!game ? (
          <div className="empty-card">
            {loading
              ? "Opening the big screen…"
              : "Open the big screen from your host control room."}
          </div>
        ) : (
          <>
            <div className="room-heading">
              <StageLabel game={game} />
              <strong>
                GAME CODE <span className="code-chip">{code}</span>
              </strong>
            </div>
            {game.status === "lobby" ? (
              <div className="display-lobby">
                <div>
                  <h1>
                    A room full
                    <br />
                    of <span className="serif">possibility.</span>
                  </h1>
                  <p>{game.title}</p>
                  <div className="host-count">
                    <Users size={32} />
                    <strong>{game.playerCount}</strong>
                    <span>players are in</span>
                  </div>
                </div>
                <div className="display-qr">
                  {qr && (
                    <img
                      src={qr}
                      width={300}
                      height={300}
                      alt="Scan this code to join the game"
                    />
                  )}
                  <strong>SCAN IN. GAME ON.</strong>
                  <span>Or enter {code} on the game homepage</span>
                </div>
              </div>
            ) : game.status === "finished" ? (
              <>
                <h1 className="display-title">
                  Meet your <span className="serif">champions.</span>
                </h1>
                <Leaderboard game={game} />
              </>
            ) : (
              <>
                <div className="display-question-top">
                  <h1 className="question-title">{game.question?.text}</h1>
                  <strong className="big-timer">
                    {Math.max(0, Math.ceil((game.endsAt - now) / 1000))}
                    <small>SEC</small>
                  </strong>
                </div>
                <div className="answer-grid">
                  {game.question?.options.map((option, i) => (
                    <div
                      key={i}
                      className={`answer option-${i} ${game.status === "reveal" && game.correct === i ? "correct" : ""}`}
                    >
                      <span className="option-letter">{"ABCD"[i]}</span>
                      <span>{option}</span>
                      {game.status === "reveal" && (
                        <strong className="vote-total">
                          {game.counts?.[i] || 0}
                          <small> votes</small>
                        </strong>
                      )}
                    </div>
                  ))}
                </div>
                {game.status === "reveal" ? (
                  <Leaderboard game={game} />
                ) : (
                  <p className="answer-status">
                    {now >= game.endsAt
                      ? "Time’s up. Waiting for the results…"
                      : "Choose your answer on your phone."}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
