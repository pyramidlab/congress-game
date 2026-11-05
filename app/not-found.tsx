import Link from "next/link";
import { Nav } from "./components";
export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="play-shell">
        <div className="empty-card">
          <span className="eyebrow">404 · WRONG ROOM</span>
          <h1>
            Looking for
            <br />
            <span className="serif">the game?</span>
          </h1>
          <p>This page does not exist. Join with the code your host shared.</p>
          <Link className="button lime" href="/play">
            Join a game
          </Link>
        </div>
      </main>
    </>
  );
}
