"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="play-shell">
      <div className="empty-card">
        <h1>
          Let’s try <span className="serif">that again.</span>
        </h1>
        <p>
          The page could not finish loading. Your confirmed game progress is
          kept.
        </p>
        <div className="row">
          <button className="button lime" onClick={reset}>
            Retry this page
          </button>
          <Link className="button subtle" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
