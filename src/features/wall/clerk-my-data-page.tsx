"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ClerkMyDataPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const exportMyData = useAction(api.gdpr.exportMyData);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const data = await exportMyData({});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "localwall-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="clerk-custom-page">
      <h1 className="clerk-custom-page-title">My data</h1>
      <p className="clerk-custom-page-desc">
        Download a copy of everything LocalWall holds about you — your profile, cards, reviews, and saved content — as a JSON file.
      </p>
      <button className={`clerk-custom-page-btn${done ? " done" : ""}`} onClick={handleExport} disabled={busy}>
        {busy ? "Exporting…" : done ? "✓ Downloaded" : "Download my data"}
      </button>
      {error ? <p className="clerk-custom-page-error">{error}</p> : null}
    </div>
  );
}
