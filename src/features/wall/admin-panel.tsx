"use client";

import { AlertTriangle, BarChart2, Check, Eye, EyeOff, Flag, Mail, Phone, Search, Send, ShieldCheck, Share2, Bookmark, ExternalLink, MapPin, Trash2, UserRound, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export interface AdminDashboardData {
  stats: { cards: number; published: number; users: number; reports: number; searches: number };
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
    conversions?: { website: number; phone: number; email: number; social: number; saves: number; shares: number; total: number };
  }>;
  users: Array<{
    id: Id<"users">;
    displayName?: string;
    email?: string;
    blockedAt?: number;
    blockedReason?: string;
    createdAt: number;
    cardCount: number;
  }>;
  reports: Array<{ id: Id<"reports">; cardId: Id<"cards">; cardName: string; reason: string; details?: string; createdAt: number }>;
  searchInsights?: { topKeywords: Array<{ keyword: string; count: number }>; topCategories: Array<{ category: string; count: number }>; total: number };
}

interface AdminPanelProps {
  data?: AdminDashboardData;
  onClose: () => void;
  onSetCardStatus: (cardId: Id<"cards">, status: "published" | "hidden") => Promise<void>;
  onDeleteCard: (cardId: Id<"cards">) => Promise<void>;
  onBlockUser: (userId: Id<"users">) => Promise<void>;
  onUnblockUser: (userId: Id<"users">, restoreCards: boolean) => Promise<void>;
  onResolveReport: (reportId: Id<"reports">) => Promise<void>;
  onSendTestEmail: (to: string) => Promise<void>;
}

function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

export function AdminPanel({ data, onClose, onSetCardStatus, onDeleteCard, onBlockUser, onUnblockUser, onResolveReport, onSendTestEmail }: AdminPanelProps) {
  const [tab, setTab] = useState<"cards" | "users" | "reports" | "analytics">("cards");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDashboardData["cards"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const cards = useMemo(() => (data?.cards ?? []).filter((card) => !deferredQuery || [card.name, card.line, card.area, card.city, card.ownerName, card.ownerEmail].some((value) => value?.toLowerCase().includes(deferredQuery))), [data?.cards, deferredQuery]);
  const users = useMemo(() => (data?.users ?? []).filter((user) => !deferredQuery || [user.displayName, user.email].some((value) => value?.toLowerCase().includes(deferredQuery))), [data?.users, deferredQuery]);
  const reports = useMemo(() => (data?.reports ?? []).filter((report) => !deferredQuery || [report.cardName, report.reason, report.details].some((value) => value?.toLowerCase().includes(deferredQuery))), [data?.reports, deferredQuery]);
  const cardsById = useMemo(() => new Map((data?.cards ?? []).map((card) => [String(card.id), card])), [data?.cards]);

  const sendMessage = (email: string | undefined, context: string) => {
    if (!email) {
      setError("This owner has no public email address.");
      return;
    }
    const subject = encodeURIComponent(`WALL moderation notice: ${context}`);
    const body = encodeURIComponent("Hello,\n\nThis is a moderation message from WALL admin regarding your card/account.\n\nPlease reply to this email for support.\n");
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
  };

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
          <div><Search /><span>Searches (30d)</span><strong>{data?.stats.searches ?? "—"}</strong></div>
        </div>

        <div className="admin-tools">
          <label htmlFor="admin-test-email-input"><Mail size={13} />Test reminder email</label>
          <input
            id="admin-test-email-input"
            type="email"
            placeholder="recipient@example.com"
            value={testEmailTo}
            onChange={(e) => { setTestEmailTo(e.target.value); setTestEmailStatus("idle"); }}
          />
          <button
            className="secondary"
            disabled={testEmailStatus === "sending" || !testEmailTo.includes("@")}
            onClick={async () => {
              setTestEmailStatus("sending");
              setError(null);
              try {
                await onSendTestEmail(testEmailTo);
                setTestEmailStatus("sent");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Test email failed.");
                setTestEmailStatus("error");
              }
            }}
          >
            {testEmailStatus === "sending" ? "Sending…" : testEmailStatus === "sent" ? <><Check size={13} /> Sent</> : <><Send size={13} /> Send test</>}
          </button>
          {testEmailStatus === "sent" ? <span className="admin-tools-ok">Email sent</span> : null}
        </div>

        <div className="admin-controls">
          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            <button role="tab" aria-selected={tab === "cards"} className={tab === "cards" ? "selected" : ""} onClick={() => setTab("cards")}>Cards</button>
            <button role="tab" aria-selected={tab === "users"} className={tab === "users" ? "selected" : ""} onClick={() => setTab("users")}>Users</button>
            <button role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "selected" : ""} onClick={() => setTab("reports")}>Reports</button>
            <button role="tab" aria-selected={tab === "analytics"} className={tab === "analytics" ? "selected" : ""} onClick={() => setTab("analytics")}><BarChart2 size={13} /> Analytics</button>
          </div>
          {tab !== "analytics" ? <label className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}`} aria-label={`Search ${tab}`} /></label> : null}
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
                    {card.conversions && card.conversions.total > 0 ? (
                      <div className="admin-conversions">
                        {card.conversions.website > 0 ? <span title="Website clicks"><ExternalLink size={10} />{card.conversions.website}</span> : null}
                        {card.conversions.phone > 0 ? <span title="Phone taps"><Phone size={10} />{card.conversions.phone}</span> : null}
                        {card.conversions.email > 0 ? <span title="Email clicks"><Mail size={10} />{card.conversions.email}</span> : null}
                        {card.conversions.social > 0 ? <span title="Social clicks"><MapPin size={10} />{card.conversions.social}</span> : null}
                        {card.conversions.saves > 0 ? <span title="Saves"><Bookmark size={10} />{card.conversions.saves}</span> : null}
                        {card.conversions.shares > 0 ? <span title="Shares"><Share2 size={10} />{card.conversions.shares}</span> : null}
                        <span className="admin-conv-total">{card.conversions.total} conversions</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="admin-row-actions admin-row-actions-wide">
                    <button className="secondary" disabled={!card.ownerEmail} onClick={() => sendMessage(card.ownerEmail, card.name)}><Mail /> Send message</button>
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
                <div className="admin-row-actions admin-row-actions-wide">
                  <button className="secondary" disabled={!user.email} onClick={() => sendMessage(user.email, user.displayName || "WALL account")}><Mail /> Send message</button>
                  <button className="secondary danger-action" disabled={busyId === String(user.id)} onClick={async () => {
                    setBusyId(String(user.id));
                    setError(null);
                    try {
                      if (user.blockedAt) {
                        const restoreCards = window.confirm("Also restore this user's hidden non-expired cards?");
                        await onUnblockUser(user.id, restoreCards);
                      } else {
                        await onBlockUser(user.id);
                      }
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : user.blockedAt ? "The user could not be unblocked." : "The user could not be blocked.");
                    } finally {
                      setBusyId(null);
                    }
                  }}>{user.blockedAt ? <><Check /> Unblock user</> : <><Flag /> Block user</>}</button>
                </div>
              </article>
            ))}
            {!users.length ? <div className="dashboard-empty">No users match this search.</div> : null}
          </div>
        ) : null}

        {data && tab === "analytics" ? (
          <div className="admin-analytics" role="tabpanel">
            <div className="admin-analytics-section">
              <h3>Top search keywords <span className="admin-analytics-period">(last 30 days)</span></h3>
              {data.searchInsights && data.searchInsights.topKeywords.length > 0 ? (
                <ol className="admin-analytics-list">
                  {data.searchInsights.topKeywords.map(({ keyword, count }) => (
                    <li key={keyword}>
                      <span className="admin-analytics-term">{keyword}</span>
                      <span className="admin-analytics-bar" style={{ width: `${Math.round((count / (data.searchInsights?.topKeywords[0]?.count ?? 1)) * 100)}%` }} />
                      <span className="admin-analytics-count">{count}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="dashboard-empty">No keyword searches yet.</p>}
            </div>
            <div className="admin-analytics-section">
              <h3>Top searched categories <span className="admin-analytics-period">(last 30 days)</span></h3>
              {data.searchInsights && data.searchInsights.topCategories.length > 0 ? (
                <ol className="admin-analytics-list">
                  {data.searchInsights.topCategories.map(({ category, count }) => (
                    <li key={category}>
                      <span className="admin-analytics-term">{category}</span>
                      <span className="admin-analytics-bar" style={{ width: `${Math.round((count / (data.searchInsights?.topCategories[0]?.count ?? 1)) * 100)}%` }} />
                      <span className="admin-analytics-count">{count}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="dashboard-empty">No category searches yet.</p>}
            </div>
            <div className="admin-analytics-section">
              <h3>Top converting cards</h3>
              {data.cards.filter((c) => (c.conversions?.total ?? 0) > 0).length > 0 ? (
                <ol className="admin-analytics-list">
                  {data.cards
                    .filter((c) => (c.conversions?.total ?? 0) > 0)
                    .sort((a, b) => (b.conversions?.total ?? 0) - (a.conversions?.total ?? 0))
                    .slice(0, 10)
                    .map((card) => (
                      <li key={String(card.id)}>
                        <span className="admin-analytics-term">{card.name} <em>{card.city}</em></span>
                        <span className="admin-analytics-card-stats">
                          {card.clicks} opens · {card.conversions?.total} conv.
                          {card.conversions?.phone ? <> · <Phone size={10} />{card.conversions.phone}</> : null}
                          {card.conversions?.website ? <> · <ExternalLink size={10} />{card.conversions.website}</> : null}
                          {card.conversions?.email ? <> · <Mail size={10} />{card.conversions.email}</> : null}
                        </span>
                      </li>
                    ))}
                </ol>
              ) : <p className="dashboard-empty">No conversion data yet.</p>}
            </div>
          </div>
        ) : null}

        {data && tab === "reports" ? (
          <div className="admin-list" role="tabpanel">
            {reports.map((report) => {
              const card = cardsById.get(String(report.cardId));
              const busy = busyId === String(report.id);
              return (
                <article className="admin-row" key={String(report.id)}>
                  <div className="admin-row-main"><div><span>{dateLabel(report.createdAt)}</span></div><h3>{report.cardName}</h3><p>{report.details || report.reason}</p><small>Reason: {report.reason}</small></div>
                  <div className="admin-row-actions admin-row-actions-wide">
                    <button className="secondary" disabled={!card?.ownerEmail || busy} onClick={() => sendMessage(card?.ownerEmail, card?.name || report.cardName)}><Mail /> Send message</button>
                    <button className="secondary" disabled={!card || busy || card.status === "expired"} onClick={async () => {
                      if (!card) return;
                      setBusyId(String(report.id));
                      setError(null);
                      try {
                        await onSetCardStatus(card.id, "hidden");
                        await onResolveReport(report.id);
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : "The card could not be hidden.");
                      } finally {
                        setBusyId(null);
                      }
                    }}><EyeOff /> Hide</button>
                    <button className="secondary danger-action" disabled={!card || busy} onClick={async () => {
                      if (!card) return;
                      setBusyId(String(report.id));
                      setError(null);
                      try {
                        await onDeleteCard(card.id);
                        await onResolveReport(report.id);
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : "The card could not be deleted.");
                      } finally {
                        setBusyId(null);
                      }
                    }}><Trash2 /> Delete</button>
                    <button className="secondary" disabled={busy} onClick={async () => { setBusyId(String(report.id)); try { await onResolveReport(report.id); } finally { setBusyId(null); } }}><Check /> Resolve</button>
                  </div>
                </article>
              );
            })}
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
