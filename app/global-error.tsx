"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string, message?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
    navigator.sendBeacon(
      "/api/vitals",
      JSON.stringify({
        name: "client.error",
        message: error.message ?? "Unknown error",
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="nf-page">
          <div className="nf-grain" />
          <div className="nf-ghost nf-ghost-1" aria-hidden="true" />
          <div className="nf-ghost nf-ghost-2" aria-hidden="true" />
          <div className="nf-ghost nf-ghost-3" aria-hidden="true" />

          <div className="nf-card support-card">
            <div className="nf-tape" aria-hidden="true" />
            <div className="nf-stamp" aria-hidden="true">MISSING</div>

            <p className="nf-eyebrow">Notice · Error 404</p>
            <h1 className="nf-code">404</h1>
            <h2 className="nf-headline">This spot is empty.</h2>
            <p className="support-card-body">
              An unexpected error interrupted the page. Try again, and if it keeps happening, come back through the wall.
            </p>

            <div className="support-card-actions">
              <button type="button" className="nf-btn-primary" onClick={reset}>Try again</button>
              <a href="/" className="nf-btn-secondary">Back to LocalWall</a>
            </div>

            <footer className="nf-card-footer">
              <span>LocalWall</span>
              <span>your local bulletin board</span>
            </footer>
          </div>

          <p className="nf-brand">WALL</p>
        </main>
      </body>
    </html>
  );
}
