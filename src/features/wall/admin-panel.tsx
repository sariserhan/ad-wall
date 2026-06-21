"use client";

import { AlertTriangle, Check, Eye, EyeOff, Flag, Search, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export interface AdminDashboardData {
  stats: { cards: number; published: number; users: number; reports: number };
  cards: Array<{
    id: Id<"cards">;
    name: string;
    line: string;
    area: string;
    city: string;
    state: string;
    country: string;
    status: "published" | "hidden" | "expired";
    ownerName?: string;
    ownerEmail?: string;
    clicks: number;
    expiresAt: number;
    createdAt: number;
  }>;
  users: Array<{
    id: Id<"users">;
    displayName?: string;
    email?: string;
    createdAt: number;
    cardCount: number;
  }>;
  reports: Array<{ id: Id<"reports">; cardId: Id<"cards">; cardName: string; reason: string; details?: string; createdAt: number }>;
}

interface AdminPanelProps {
  data?: AdminDashboardData;
  onClose: () => void;
  onSetCardStatus: (cardId: Id<"cards">, status: "published" | "hidden") => Promise<void>;
  onDeleteCard: (cardId: Id<"cards">) => Promise<void>;
  onResolveReport: (reportId: Id<"reports">) => Promise<void>;
}

function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

export function AdminPanel({ data, onClose, onSetCardStatus, onDeleteCard, onResolveReport }: AdminPanelProps) {
  const [tab, setTab] = useState<"cards" | "users" | "reports">("cards");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDashboardData["cards"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const cards = useMemo(() => (data?.cards ?? []).filter((card) => !deferredQuery || [card.name, card.line, card.area, card.city, card.ownerName, card.ownerEmail].some((value) => value?.toLowerCase().includes(deferredQuery))), [data?.cards, deferredQuery]);
  const users = useMemo(() => (data?.users ?? []).filter((user) => !deferredQuery || [user.displayName, user.email].some((value) => value?.toLowerCase().includes(deferredQuery))), [data?.users, deferredQuery]);
  const reports = useMemo(() => (data?.reports ?? []).filter((report) => !deferredQuery || [report.cardName, report.reason, report.details].some((value) => value?.toLowerCase().includes(deferredQuery))), [data?.reports, deferredQuery]);

  const setStatus = async (card: AdminDashboardData["cards"][number]) => {
    const status = card.status === "published" ? "hidden" : "published";
    setBusyId(String(card.id));
    setError(null);
    try {
      await onSetCardStatus(card.id, status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be updated.");
    } finally {
      setBusyId(null);
    }
  };

  const removeCard = async () => {
    if (!deleteTarget) return;
    setBusyId(String(deleteTarget.id));
    setError(null);
    try {
      await onDeleteCard(deleteTarget.id);
      setDeleteTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be deleted.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dashboard-backdrop admin-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="owner-dashboard admin-panel" aria-label="Admin panel">
        <header className="dashboard-header">
          <div><span>WALL ADMINISTRATION</span><h2>Admin panel</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close admin panel"><X /></button>
        </header>

        <div className="dashboard-stats">
          <div><ShieldCheck /><span>Published cards</span><strong>{data?.stats.published ?? "—"}</strong></div>
          <div><Eye /><span>Recent cards</span><strong>{data?.stats.cards ?? "—"}</strong></div>
          <div><UserRound /><span>Recent users</span><strong>{data?.stats.users ?? "—"}</strong></div>
          <div><Flag /><span>Open reports</span><strong>{data?.stats.reports ?? "—"}</strong></div>
        </div>

        <div className="admin-controls">
          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            <button role="tab" aria-selected={tab === "cards"} className={tab === "cards" ? "selected" : ""} onClick={() => setTab("cards")}>Cards</button>
            <button role="tab" aria-selected={tab === "users"} className={tab === "users" ? "selected" : ""} onClick={() => setTab("users")}>Users</button>
            <button role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "selected" : ""} onClick={() => setTab("reports")}>Reports</button>
          </div>
          <label className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}`} aria-label={`Search ${tab}`} /></label>
        </div>

        {error ? <div className="dashboard-error" role="alert">{error}</div> : null}
        {!data ? <div className="dashboard-empty">Loading administration data…</div> : null}

        {data && tab === "cards" ? (
          <div className="admin-list" role="tabpanel">
            {cards.map((card) => {
              const busy = busyId === String(card.id);
              return (
                <article className="admin-row" key={String(card.id)}>
                  <div className="admin-row-main">
                    <div><span className={`status-dot status-${card.status}`} />{card.status}<span>{dateLabel(card.createdAt)}</span></div>
                    <h3>{card.name}</h3>
                    <p>{card.line}</p>
                    <small>{card.ownerName || card.ownerEmail || "Unknown owner"} · {card.city}, {card.state || card.country} · {card.clicks} opens</small>
                  </div>
                  <div className="admin-row-actions">
                    <button className="secondary" disabled={busy || card.status === "expired"} onClick={() => setStatus(card)}>{card.status === "published" ? <><EyeOff /> Hide</> : <><Eye /> Restore</>}</button>
                    <button className="secondary danger-action" disabled={busy} onClick={() => setDeleteTarget(card)}><Trash2 /> Delete</button>
                  </div>
                </article>
              );
            })}
            {!cards.length ? <div className="dashboard-empty">No cards match this search.</div> : null}
          </div>
        ) : null}

        {data && tab === "users" ? (
          <div className="admin-list" role="tabpanel">
            {users.map((user) => (
              <article className="admin-row admin-user-row" key={String(user.id)}>
                <div className="admin-avatar">{(user.displayName || user.email || "U").slice(0, 1).toUpperCase()}</div>
                <div className="admin-row-main"><h3>{user.displayName || "Unnamed user"}</h3><p>{user.email || "No public email"}</p><small>Joined {dateLabel(user.createdAt)} · {user.cardCount} recent cards</small></div>
              </article>
            ))}
            {!users.length ? <div className="dashboard-empty">No users match this search.</div> : null}
          </div>
        ) : null}

        {data && tab === "reports" ? (
          <div className="admin-list" role="tabpanel">
            {reports.map((report) => <article className="admin-row" key={String(report.id)}><div className="admin-row-main"><div><span>{dateLabel(report.createdAt)}</span></div><h3>{report.cardName}</h3><p>{report.details || report.reason}</p><small>Reason: {report.reason}</small></div><div className="admin-row-actions"><button className="secondary" disabled={busyId === String(report.id)} onClick={async () => { setBusyId(String(report.id)); try { await onResolveReport(report.id); } finally { setBusyId(null); } }}><Check /> Resolve</button></div></article>)}
            {!reports.length ? <div className="dashboard-empty">No open reports.</div> : null}
          </div>
        ) : null}
      </section>

      {deleteTarget ? (
        <div className="dashboard-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
          <div className="dashboard-confirm"><AlertTriangle /><h3>Delete this card?</h3><p>“{deleteTarget.name}” and its uploaded images will be permanently removed.</p><div><button className="secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="primary danger-confirm" onClick={removeCard} disabled={busyId === String(deleteTarget.id)}>Delete card</button></div></div>
        </div>
      ) : null}
    </div>
  );
}
