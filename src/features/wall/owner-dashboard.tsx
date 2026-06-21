"use client";

import { AlertTriangle, BarChart3, Check, Clock3, Eye, EyeOff, MousePointerClick, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EditCardModal } from "./edit-card-modal";
import type { CardUpdate, OwnerCard, RenewalAmount } from "./types";

interface OwnerDashboardProps {
  cards: OwnerCard[];
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
  onView: (card: OwnerCard) => void;
  onSetVisibility: (card: OwnerCard, status: "published" | "hidden") => Promise<void>;
  onUpdate: (card: OwnerCard, update: CardUpdate) => Promise<void>;
  onDelete: (card: OwnerCard) => Promise<void>;
  onRenew: (card: OwnerCard, paidAmount: RenewalAmount) => Promise<void>;
}

const renewalOptions: ReadonlyArray<{ amount: RenewalAmount; price: string; duration: string }> = [
  { amount: 0, price: "Free", duration: "1 day" },
  { amount: 1, price: "$1", duration: "1 week" },
  { amount: 3, price: "$3", duration: "1 month" },
  { amount: 10, price: "$10", duration: "5 months" },
  { amount: 20, price: "$20", duration: "1 year" },
];

function expiryLabel(expiresAt: number) {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function OwnerDashboard({ cards, loading, onClose, onCreate, onView, onSetVisibility, onUpdate, onDelete, onRenew }: OwnerDashboardProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<OwnerCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerCard | null>(null);
  const [renewTarget, setRenewTarget] = useState<OwnerCard | null>(null);
  const [renewalAmount, setRenewalAmount] = useState<RenewalAmount>(3);
  const stats = useMemo(() => ({
    totalViews: cards.reduce((sum, card) => sum + card.clicks, 0),
    live: cards.filter((card) => card.status === "published").length,
    actions: cards.reduce((sum, card) => sum + (card.websiteClicks ?? 0) + (card.phoneClicks ?? 0) + (card.emailClicks ?? 0) + (card.socialClicks ?? 0), 0),
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

  const deleteCard = async () => {
    if (!deleteTarget) return;
    setBusyId(String(deleteTarget.id));
    setError(null);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be deleted.");
    } finally {
      setBusyId(null);
    }
  };

  const renewCard = async () => {
    if (!renewTarget) return;
    setBusyId(String(renewTarget.id));
    setError(null);
    try {
      await onRenew(renewTarget, renewalAmount);
      setRenewTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be renewed.");
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
          <div><MousePointerClick /><span>Contact actions</span><strong>{stats.actions}</strong></div>
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
                  <small><Eye /> {card.clicks} opens · {(card.websiteClicks ?? 0) + (card.phoneClicks ?? 0) + (card.emailClicks ?? 0) + (card.socialClicks ?? 0)} contacts · {card.saves ?? 0} saves · {card.shares ?? 0} shares <Clock3 /> {expiryLabel(card.expiresAt)}</small>
                </div>
                <div className="dashboard-card-actions">
                  <button className="secondary" onClick={() => onView(card)}>View</button>
                  <button className="secondary" disabled={busy} onClick={() => setEditingCard(card)}><Pencil /> Edit</button>
                  <button className="secondary" disabled={busy} onClick={() => { setRenewTarget(card); setRenewalAmount(3); }}><RefreshCw /> Renew</button>
                  <button className="secondary" disabled={expired || busy} onClick={() => changeVisibility(card)}>
                    {card.status === "published" ? <><EyeOff /> Hide</> : <><Eye /> {expired ? "Expired" : "Publish"}</>}
                  </button>
                  <button className="secondary danger-action" disabled={busy} onClick={() => setDeleteTarget(card)}><Trash2 /> Delete</button>
                </div>
              </article>
            );
          })}
        </div>
        {deleteTarget ? <div className="dashboard-confirm-backdrop"><div className="dashboard-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-card-title"><AlertTriangle /><h3 id="delete-card-title">Delete {deleteTarget.name}?</h3><p>This permanently removes the card and its uploaded images. This cannot be undone.</p><div><button className="secondary" onClick={() => setDeleteTarget(null)} disabled={busyId !== null}>Cancel</button><button className="primary danger-confirm" onClick={deleteCard} disabled={busyId !== null}>{busyId ? "Deleting…" : "Delete permanently"}</button></div></div></div> : null}
        {renewTarget ? <div className="dashboard-confirm-backdrop"><div className="dashboard-confirm renewal-dialog" role="dialog" aria-modal="true" aria-labelledby="renew-card-title"><RefreshCw /><h3 id="renew-card-title">Renew {renewTarget.name}</h3><p>Choose how much time to add. Time is added after the current expiration date when the card is still active.</p><div className="renewal-options" role="radiogroup" aria-label="Renewal duration">{renewalOptions.map((option) => <button key={option.amount} type="button" role="radio" aria-checked={renewalAmount === option.amount} className={`renewal-option ${renewalAmount === option.amount ? "selected" : ""}`} onClick={() => setRenewalAmount(option.amount)}><strong>{option.price}</strong><span>{option.duration}</span>{renewalAmount === option.amount ? <Check /> : null}</button>)}</div><div className="renewal-actions"><button className="secondary" onClick={() => setRenewTarget(null)} disabled={busyId !== null}>Cancel</button><button className="primary" onClick={renewCard} disabled={busyId !== null}>{busyId ? "Starting…" : renewalAmount === 0 ? "Renew free" : `Continue for $${renewalAmount}`}</button></div></div></div> : null}
        {editingCard ? <EditCardModal card={editingCard} onClose={() => setEditingCard(null)} onSave={onUpdate} /> : null}
      </section>
    </div>
  );
}
