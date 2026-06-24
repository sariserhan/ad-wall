"use client";

import { AlertTriangle, BarChart3, Bookmark, Check, Clock3, Code2, Copy, Eye, EyeOff, MapPin, MousePointerClick, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EditCardModal } from "./edit-card-modal";
import type { CardUpdate, OwnerCard, RenewalAmount, SavedWall, WallCard } from "./types";

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 70;
  const h = 22;
  const gap = 1;
  const barW = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="card-sparkline">
      {data.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * h));
        const x = i * (barW + gap);
        return <rect key={i} x={x} y={h - barH} width={barW} height={barH} rx="1" className={v > 0 ? "spark-bar" : "spark-empty"} />;
      })}
    </svg>
  );
}

interface OwnerDashboardProps {
  cards: OwnerCard[];
  savedCards: WallCard[];
  savedWalls: SavedWall[];
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
  onView: (card: WallCard) => void;
  onRemoveSaved: (card: WallCard) => void;
  onRemoveSavedWall: (wall: SavedWall) => Promise<void>;
  onNavigateToWall: (wall: SavedWall) => void;
  onSetVisibility: (card: OwnerCard, status: "published" | "hidden") => Promise<void>;
  onUpdate: (card: OwnerCard, update: CardUpdate) => Promise<void>;
  onDelete: (card: OwnerCard) => Promise<void>;
  onRenew: (card: OwnerCard, paidAmount: RenewalAmount) => Promise<void>;
  profile: { displayName: string | null; username: string | null; businessName: string | null; verified?: boolean; verificationStatus?: "pending" | "approved" | "rejected" | null } | null;
  onUpdateProfile?: (username: string | undefined, businessName: string | undefined) => Promise<void>;
  onRequestVerification?: (plan: "monthly" | "annual") => Promise<void>;
  cardDailyStats?: { dates: string[]; byCard: Record<string, number[]> } | null;
}

const renewalOptions: ReadonlyArray<{ amount: RenewalAmount; name: string; price: string; duration: string }> = [
  { amount: 0,     name: "Free",     price: "Free",   duration: "1 day"    },
  { amount: 2.99,  name: "Basic",    price: "$2.99",  duration: "30 days"  },
  { amount: 7.99,  name: "Featured", price: "$7.99",  duration: "90 days"  },
  { amount: 24.99, name: "Business", price: "$24.99", duration: "365 days" },
];

function expiryLabel(expiresAt: number) {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function OwnerDashboard({ cards, savedCards, savedWalls, loading, onClose, onCreate, onView, onRemoveSaved, onRemoveSavedWall, onNavigateToWall, onSetVisibility, onUpdate, onDelete, onRenew, profile, onUpdateProfile, onRequestVerification, cardDailyStats }: OwnerDashboardProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<OwnerCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerCard | null>(null);
  const [renewTarget, setRenewTarget] = useState<OwnerCard | null>(null);
  const [renewalAmount, setRenewalAmount] = useState<RenewalAmount>(7.99);
  const [usernameInput, setUsernameInput] = useState(profile?.username ?? "");
  const [businessNameInput, setBusinessNameInput] = useState(profile?.businessName ?? "");
  useEffect(() => { setUsernameInput(profile?.username ?? ""); }, [profile?.username]);
  useEffect(() => { setBusinessNameInput(profile?.businessName ?? ""); }, [profile?.businessName]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [embedTarget, setEmbedTarget] = useState<OwnerCard | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  const requestVerification = async (plan: "monthly" | "annual") => {
    if (!onRequestVerification) return;
    setVerificationBusy(true);
    setVerificationError(null);
    try {
      await onRequestVerification(plan);
    } catch (cause) {
      setVerificationError(cause instanceof Error ? cause.message : "Verification could not be started.");
    } finally {
      setVerificationBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!onUpdateProfile) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await onUpdateProfile(usernameInput.trim() || undefined, businessNameInput.trim() || undefined);
      setUsernameInput("");
      setBusinessNameInput("");
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Profile could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  };
  const stats = useMemo(() => ({
    totalViews: cards.reduce((sum, card) => sum + card.clicks, 0),
    live: cards.filter((card) => card.status === "published").length,
    actions: cards.reduce((sum, card) => sum + (card.websiteClicks ?? 0) + (card.phoneClicks ?? 0) + (card.emailClicks ?? 0) + (card.socialClicks ?? 0), 0),
    saved: savedCards.length,
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
          <div><span>YOUR WALL</span><h2>My Board</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dashboard"><X /></button>
        </header>

        <div className="dashboard-profile">
          <div className="dashboard-profile-header"><User size={14} /><strong>Profile</strong></div>
          <div className="dashboard-profile-body">
            {profile?.displayName ? (
              <div className="dashboard-profile-row">
                <span>Display name</span>
                <p>{profile.displayName}</p>
              </div>
            ) : null}
            <div className="dashboard-profile-row">
              <label htmlFor="dashboard-username">Username <span>(optional)</span></label>
              <div className="dashboard-profile-input-wrap">
                <input
                  id="dashboard-username"
                  type="text"
                  maxLength={40}
                  placeholder={profile?.displayName ?? "Your name or handle"}
                  value={usernameInput}
                  onChange={(e) => { setUsernameInput(e.target.value); setProfileSaved(false); }}
                />
                {usernameInput ? (
                  <button type="button" className="dashboard-input-clear" onClick={() => { setUsernameInput(""); setProfileSaved(false); }} aria-label="Clear username"><X size={12} /></button>
                ) : null}
              </div>
            </div>
            <div className="dashboard-profile-row">
              <label htmlFor="dashboard-biz-name">Business name <span>(optional)</span></label>
              <div className="dashboard-profile-input-wrap">
                <input
                  id="dashboard-biz-name"
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Serhan's Plumbing LLC"
                  value={businessNameInput}
                  onChange={(e) => { setBusinessNameInput(e.target.value); setProfileSaved(false); }}
                />
                {businessNameInput ? (
                  <button type="button" className="dashboard-input-clear" onClick={() => { setBusinessNameInput(""); setProfileSaved(false); }} aria-label="Clear business name"><X size={12} /></button>
                ) : null}
              </div>
            </div>
            <div className="dashboard-profile-save-row">
              <p className="dashboard-profile-hint">Cards show your business name if set, otherwise username, otherwise display name.</p>
              <button className="primary" onClick={() => void saveProfile()} disabled={profileSaving}>
                {profileSaved ? <><Check size={14} /> Saved</> : profileSaving ? "Saving…" : "Save profile"}
              </button>
            </div>
            {profileError ? <p className="dashboard-profile-error">{profileError}</p> : null}
          </div>
        </div>

        <div className="dashboard-verification">
          <div className="dashboard-verification-header"><ShieldCheck size={14} /><strong>Verified Business Badge</strong></div>
          {profile?.verified ? (
            <div className="dashboard-verification-active">
              <span className="verification-active-check">✓</span>
              <div>
                <strong>Your business is verified</strong>
                <p>Your checkmark appears on all your cards.</p>
              </div>
            </div>
          ) : profile?.verificationStatus === "pending" ? (
            <div className="dashboard-verification-status">
              <span className="verification-status-tag pending">Under Review</span>
              <p>Our team is reviewing your request. Your badge will go live within 24 hours of approval.</p>
            </div>
          ) : profile?.verificationStatus === "rejected" ? (
            <div className="dashboard-verification-status">
              <span className="verification-status-tag rejected">Not Approved</span>
              <p>Your last request was not approved. You can submit a new request:</p>
              <div className="verification-plans">
                <button className="verification-plan" onClick={() => void requestVerification("monthly")} disabled={verificationBusy || !onRequestVerification}>
                  <strong>$4.99</strong><span>Monthly</span>
                </button>
                <button className="verification-plan verification-plan-featured" onClick={() => void requestVerification("annual")} disabled={verificationBusy || !onRequestVerification}>
                  <strong>$19.99</strong><span>Annual — save 66%</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="dashboard-verification-cta">
              <p>Get a ✓ verified checkmark on all your cards — builds trust and drives more clicks.</p>
              <div className="verification-plans">
                <button className="verification-plan" onClick={() => void requestVerification("monthly")} disabled={verificationBusy || !onRequestVerification}>
                  <strong>$4.99 / mo</strong><span>Monthly</span>
                </button>
                <button className="verification-plan verification-plan-featured" onClick={() => void requestVerification("annual")} disabled={verificationBusy || !onRequestVerification}>
                  <strong>$19.99 / yr</strong><span>Annual — save 66%</span>
                </button>
              </div>
            </div>
          )}
          {verificationError ? <p className="dashboard-profile-error">{verificationError}</p> : null}
        </div>

        <div className="dashboard-stats">
          <div><BarChart3 /><span>Total card opens</span><strong>{stats.totalViews}</strong></div>
          <div><Eye /><span>Live cards</span><strong>{stats.live}</strong></div>
          <div><MousePointerClick /><span>Contact actions</span><strong>{stats.actions}</strong></div>
          <div><Bookmark /><span>Total card saved</span><strong>{stats.saved}</strong></div>
        </div>

        <div className="dashboard-toolbar">
          <div><strong>Your cards</strong><span>Manage visibility and expiration.</span></div>
          <button className="primary" onClick={onCreate}><Plus /> New card</button>
        </div>

        <div className="dashboard-saved-section">
          <div className="dashboard-saved-header"><strong>Saved cards</strong><span>Cards you bookmarked for later.</span></div>
          {savedCards.length === 0 ? <div className="dashboard-saved-empty">No saved cards yet.</div> : (
            <div className="dashboard-card-list dashboard-saved-list">
              {savedCards.map((card) => (
                <article className="dashboard-card-row" key={`saved-${String(card.id)}`}>
                <div className={`dashboard-card-thumb theme-${card.theme}`}>{card.thumbnailImages?.[0] || card.images[0] ? <img src={card.thumbnailImages?.[0] ?? card.images[0]} alt="" loading="lazy" decoding="async" /> : <span>{card.name.slice(0, 1)}</span>}</div>
                  <div className="dashboard-card-copy">
                    <div><Bookmark /> saved</div>
                    <h3>{card.name}</h3>
                    <p>{card.line}</p>
                    <small><Eye /> {card.clicks ?? 0} views</small>
                  </div>
                  <div className="dashboard-card-actions">
                    <button className="secondary" onClick={() => onView(card)}>View</button>
                    <button className="secondary danger-action" onClick={() => onRemoveSaved(card)}>Remove from saved</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-saved-section">
          <div className="dashboard-saved-header"><strong>Saved walls</strong><span>Neighborhoods you saved for quick access.</span></div>
          {savedWalls.length === 0 ? <div className="dashboard-saved-empty">No saved walls yet. Browse a city and hit "Save wall".</div> : (
            <div className="dashboard-walls-list">
              {savedWalls.map((wall) => (
                <div className="dashboard-wall-row" key={wall.path}>
                  <div className="dashboard-wall-copy">
                    <MapPin size={14} />
                    <span>{wall.label}</span>
                  </div>
                  <div className="dashboard-card-actions">
                    <button className="secondary" onClick={() => { onNavigateToWall(wall); onClose(); }}>Visit</button>
                    <button className="secondary danger-action" onClick={() => void onRemoveSavedWall(wall)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <div className="dashboard-error">{error}</div> : null}
        {loading ? <div className="dashboard-empty">Loading your cards…</div> : null}
        {!loading && cards.length === 0 ? (
          <div className="dashboard-empty"><strong>Your wall is waiting.</strong><span>Post your first card to start tracking its reach.</span><button className="primary" onClick={onCreate}><Plus /> Post a card</button></div>
        ) : null}

        <div className="dashboard-owned-section">
          <div className="dashboard-owned-header"><strong>Your cards</strong><span>Manage visibility and expiration.</span></div>
          <div className="dashboard-card-list dashboard-owned-list">
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
                    <small><Eye /> {card.clicks} views · {(card.websiteClicks ?? 0) + (card.phoneClicks ?? 0) + (card.emailClicks ?? 0) + (card.socialClicks ?? 0)} contacts · {card.saves ?? 0} saves · {card.shares ?? 0} shares <Clock3 /> {expiryLabel(card.expiresAt)}</small>
                    {(() => {
                      const data = cardDailyStats?.byCard[String(card.id)];
                      if (!data) return null;
                      const lastWeek = data.slice(0, 7).reduce((a, b) => a + b, 0);
                      const thisWeek = data.slice(7).reduce((a, b) => a + b, 0);
                      const diff = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
                      return (
                        <div className="card-spark-row">
                          <Sparkline data={data} />
                          <span className="spark-trend">
                            {thisWeek} views this week
                            {diff !== null ? <span className={diff >= 0 ? "trend-up" : "trend-down"}>{diff >= 0 ? ` ↑${diff}%` : ` ↓${Math.abs(diff)}%`}</span> : null}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="dashboard-card-actions">
                    <button className="secondary" disabled={expired} onClick={() => onView(card)}>View</button>
                    <button className="secondary" disabled={busy} onClick={() => setEditingCard(card)}><Pencil /> Edit</button>
                    <button className="secondary" disabled={busy} onClick={() => { setRenewTarget(card); setRenewalAmount(7.99); }}><RefreshCw /> Renew</button>
                    <button className="secondary" disabled={expired || busy} onClick={() => changeVisibility(card)}>
                      {card.status === "published" ? <><EyeOff /> Hide</> : <><Eye /> {expired ? "Expired" : "Publish"}</>}
                    </button>
                    <button className="secondary" disabled={expired} onClick={() => { setEmbedTarget(card); setEmbedCopied(false); }}><Code2 size={13} /> Embed</button>
                    <button className="secondary danger-action" disabled={busy} onClick={() => setDeleteTarget(card)}><Trash2 /> Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        {deleteTarget ? <div className="dashboard-confirm-backdrop"><div className="dashboard-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-card-title"><AlertTriangle /><h3 id="delete-card-title">Delete {deleteTarget.name}?</h3><p>This permanently removes the card and its uploaded images. This cannot be undone.</p><div><button className="secondary" onClick={() => setDeleteTarget(null)} disabled={busyId !== null}>Cancel</button><button className="primary danger-confirm" onClick={deleteCard} disabled={busyId !== null}>{busyId ? "Deleting…" : "Delete permanently"}</button></div></div></div> : null}
        {renewTarget ? <div className="dashboard-confirm-backdrop"><div className="dashboard-confirm renewal-dialog" role="dialog" aria-modal="true" aria-labelledby="renew-card-title"><RefreshCw /><h3 id="renew-card-title">Renew {renewTarget.name}</h3><p>Choose how much time to add. Time is added after the current expiration date when the card is still active.</p><div className="renewal-options" role="radiogroup" aria-label="Renewal duration">{renewalOptions.map((option) => <button key={option.amount} type="button" role="radio" aria-checked={renewalAmount === option.amount} className={`renewal-option ${renewalAmount === option.amount ? "selected" : ""}`} onClick={() => setRenewalAmount(option.amount)}><strong>{option.price}</strong><span>{option.duration}</span>{renewalAmount === option.amount ? <Check /> : null}</button>)}</div><div className="renewal-actions"><button className="secondary" onClick={() => setRenewTarget(null)} disabled={busyId !== null}>Cancel</button><button className="primary" onClick={renewCard} disabled={busyId !== null}>{busyId ? "Starting…" : renewalAmount === 0 ? "Renew free" : `Continue for $${renewalAmount}`}</button></div></div></div> : null}
        {editingCard ? <EditCardModal card={editingCard} onClose={() => setEditingCard(null)} onSave={onUpdate} /> : null}
        {embedTarget ? (() => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const snippet = `<iframe\n  src="${origin}/embed/card/${String(embedTarget.id)}"\n  width="360" height="200"\n  frameborder="0"\n  style="border:none;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.15);"\n  title="${embedTarget.name.replace(/"/g, "&quot;")}"\n></iframe>`;
          return (
            <div className="dashboard-confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEmbedTarget(null)}>
              <div className="dashboard-confirm embed-dialog" role="dialog" aria-modal="true" aria-labelledby="embed-dialog-title">
                <Code2 size={20} />
                <h3 id="embed-dialog-title">Embed {embedTarget.name}</h3>
                <p>Paste this snippet into any website to show your card as a widget.</p>
                <pre className="embed-snippet">{snippet}</pre>
                <div className="embed-dialog-actions">
                  <button className="secondary" onClick={() => setEmbedTarget(null)}>Close</button>
                  <button className="primary" onClick={() => {
                    navigator.clipboard.writeText(snippet).then(() => { setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2500); }).catch(() => {});
                  }}>
                    {embedCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy code</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })() : null}
      </section>
    </div>
  );
}
