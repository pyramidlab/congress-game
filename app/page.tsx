"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Radio,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Nav } from "./components";
export default function Home() {
  const [code, setCode] = useState("");
  const router = useRouter();
  return (
    <>
      <Nav />
      <main className="landing">
        <div className="landing-copy">
          <span className="eyebrow">
            <span className="live-dot" /> A LITTLE COMPETITION. A LOT OF
            CONNECTION.
          </span>
          <h1>
            A room full
            <br />
            of people.
            <br />
            <span className="serif">One big game.</span>
          </h1>
          <p className="hero-description">
            Turn your congress into a shared experience. Live quizzes, real
            opinions, and a leaderboard everyone wants to be on.
          </p>
          <form
            className="join-inline"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{6}$/.test(code)) router.push(`/play?code=${code}`);
            }}
          >
            <label className="sr-only" htmlFor="game-code">
              Six-digit game code
            </label>
            <input
              id="game-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="Enter game code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button className="button lime" type="submit">
              Join the game <ArrowRight size={18} />
            </button>
          </form>
          <div className="join-note">
            <Check size={14} /> No downloads. Just your name and a game code.
          </div>
          <Link className="host-link" href="/host">
            Running the show?{" "}
            <strong>
              Host a game <ArrowUpRight size={16} />
            </strong>
          </Link>
        </div>
        <div
          className="hero-art"
          aria-label="Illustration of a live quiz leaderboard"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-pill">
            <Radio size={14} />
            <span>BIG ROOM ENERGY</span>
            <span className="live-dot" />
          </div>
          <div className="art-card">
            <div className="art-card-top">
              <span>THE FINAL ROUND</span>
              <Zap size={18} />
            </div>
            <div className="art-question">
              Who’s taking
              <br />
              the crown?
            </div>
            <div className="podium">
              <div className="podium-person second">
                <span className="person-face">T</span>
                <div>
                  <span>02</span>
                  <strong>Tomi</strong>
                  <small>4,650 pts</small>
                </div>
              </div>
              <div className="podium-person first">
                <span className="crown">✦</span>
                <span className="person-face">J</span>
                <div>
                  <span>01</span>
                  <strong>Jerome</strong>
                  <small>4,900 pts</small>
                </div>
              </div>
              <div className="podium-person third">
                <span className="person-face">F</span>
                <div>
                  <span>03</span>
                  <strong>Favour</strong>
                  <small>4,400 pts</small>
                </div>
              </div>
            </div>
            <div className="art-card-footer">
              <span>
                <span className="live-dot" /> EVERY VOICE COUNTS
              </span>
              <Trophy size={16} />
            </div>
          </div>
          <div className="floating-note">
            <span>↗</span> Your next favourite
            <br />
            congress moment.
          </div>
          <div className="art-caption">
            ILLUSTRATIVE SCORES · YOUR GAME, YOUR PEOPLE
          </div>
        </div>
      </main>
      <section className="feature-strip">
        <div>
          <span className="feature-icon">
            <Users size={21} />
          </span>
          <p>
            <strong>Room for everyone</strong>
            <span>Up to 200 players in one game</span>
          </p>
        </div>
        <div>
          <span className="feature-icon">
            <Zap size={21} />
          </span>
          <p>
            <strong>Play. Vote. Connect.</strong>
            <span>Mix scored quizzes with live surveys</span>
          </p>
        </div>
        <div>
          <span className="feature-icon">
            <Radio size={21} />
          </span>
          <p>
            <strong>Keep your place</strong>
            <span>Reconnect after a brief dropout</span>
          </p>
        </div>
      </section>
      <footer className="footer">
        <span>EVERY VOICE. EVERY ROUND.</span>
        <span>Built for the moments we share.</span>
      </footer>
    </>
  );
}
