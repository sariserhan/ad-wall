"use client";

import { BarChart3, Clock3, Eye, EyeOff, MousePointerClick, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { OwnerCard } from "./types";

interface OwnerDashboardProps {
  cards: OwnerCard[];
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
  onView: (card: OwnerCard) => void;
  onSetVisibility: (card: OwnerCard, status: "published" | "hidden") => Promise<void>;
}

function expiryLabel(expiresAt: number) {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function OwnerDashboard({ cards, loading, onClose, onCreate, onView, onSetVisibility }: OwnerDashboardProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stats = useMemo(() => ({
    totalViews: cards.reduce((sum, card) => sum + card.clicks, 0),
    live: cards.filter((card) => card.status === "published").length,
  }), [cards]);

  const changeVisibility = async (card: OwnerCard) => {
    const status = card.status === "published" ? "hidden" : "published";
    setBusyId(String(card.id));
    setError(null);
    try {
      await onSetVisibility(card, status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be updated.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dashboard-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="owner-dashboard" aria-label="Your card dashboard">
        <header className="dashboard-header">
          <div><span>YOUR WALL</span><h2>Card dashboard</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dashboard"><X /></button>
        </header>

        <div className="dashboard-stats">
          <div><BarChart3 /><span>Total card opens</span><strong>{stats.totalViews}</strong></div>
          <div><Eye /><span>Live cards</span><strong>{stats.live}</strong></div>
          <div><MousePointerClick /><span>Cards created</span><strong>{cards.length}</strong></div>
        </div>

        <div className="dashboard-toolbar">
          <div><strong>Your cards</strong><span>Manage visibility and expiration.</span></div>
          <button className="primary" onClick={onCreate}><Plus /> New card</button>
        </div>

        {error ? <div className="dashboard-error">{error}</div> : null}
        {loading ? <div className="dashboard-empty">Loading your cards…</div> : null}
        {!loading && cards.length === 0 ? (
          <div className="dashboard-empty"><strong>Your wall is waiting.</strong><span>Post your first card to start tracking its reach.</span><button className="primary" onClick={onCreate}><Plus /> Post a card</button></div>
        ) : null}

        <div className="dashboard-card-list">
          {cards.map((card) => {
            const expired = card.status === "expired";
            const busy = busyId === String(card.id);
            return (
              <article className="dashboard-card-row" key={String(card.id)}>
                <div className={`dashboard-card-thumb theme-${card.theme}`}>{card.images[0] ? <img src={card.images[0]} alt="" /> : <span>{card.name.slice(0, 1)}</span>}</div>
                <div className="dashboard-card-copy">
                  <div><span className={`status-dot status-${card.status}`} />{card.status}</div>
                  <h3>{card.name}</h3>
                  <p>{card.line}</p>
                  <small><Eye /> {card.clicks} opens <Clock3 /> {expiryLabel(card.expiresAt)}</small>
                </div>
                <div className="dashboard-card-actions">
                  <button className="secondary" onClick={() => onView(card)}>View</button>
                  <button className="secondary" disabled={expired || busy} onClick={() => changeVisibility(card)}>
                    {card.status === "published" ? <><EyeOff /> Hide</> : <><Eye /> {expired ? "Expired" : "Publish"}</>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
