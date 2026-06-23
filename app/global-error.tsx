"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    navigator.sendBeacon(
      "/api/vitals",
      JSON.stringify({
        name: "client.error",
        message: error.message,
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: "40px", background: "#eeece7" }}>
        <h1 style={{ color: "#f43d38" }}>Something went wrong</h1>
        <p style={{ color: "#444" }}>An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          style={{ marginTop: "16px", padding: "10px 20px", background: "#f43d38", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
