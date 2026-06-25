"use client";

import { AlertTriangle, BarChart3, Bookmark, Check, Clock3, Code2, Copy, Eye, EyeOff, MapPin, MousePointerClick, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { EditCardModal } from "./edit-card-modal";
import type { CardUpdate, OwnerCard, RenewalAmount, SavedWall, WallCard } from "./types";
import posthog from "posthog-js";
import { BLUR_PLACEHOLDER } from "@/lib/blur-placeholder";

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
  onRenew: (card: OwnerCard, paidAmount: RenewalAmount, autoRenew: boolean) => Promise<void>;
  onCancelAutoRenew?: (card: OwnerCard) => Promise<void>;
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

export function OwnerDashboard({ cards, savedCards, savedWalls, loading, onClose, onCreate, onView, onRemoveSaved, onRemoveSavedWall, onNavigateToWall, onSetVisibility, onUpdate, onDelete, onRenew, onCancelAutoRenew, profile, onUpdateProfile, onRequestVerification, cardDailyStats }: OwnerDashboardProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<OwnerCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerCard | null>(null);
  const [renewTarget, setRenewTarget] = useState<OwnerCard | null>(null);
  const [renewalAmount, setRenewalAmount] = useState<RenewalAmount>(7.99);
  const [usernameInput, setUsernameInput] = useState("");
  const [businessNameInput, setBusinessNameInput] = useState(profile?.businessName ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [selectedVerificationPlan, setSelectedVerificationPlan] = useState<"monthly" | "annual" | null>("annual");
  const [renewAutoRenew, setRenewAutoRenew] = useState(false);
  const [embedTarget, setEmbedTarget] = useState<OwnerCard | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<OwnerCard | null>(null);

  const handleClose = () => {
    setUsernameInput("");
    setBusinessNameInput("");
    setProfileSaved(false);
    setProfileError(null);
    onClose();
  };

  const requestVerification = async (plan: "monthly" | "annual") => {
    if (!onRequestVerification) return;
    setVerificationBusy(true);
    setVerificationError(null);
    try {
      await onRequestVerification(plan);
      posthog.capture("verification_checkout_started", { plan });
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
      posthog.capture("card_deleted", {
        card_name: deleteTarget.name,
        category: deleteTarget.category,
      });
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
      await onRenew(renewTarget, renewalAmount, renewAutoRenew && renewalAmount !== 0);
      posthog.capture("card_renewed", {
        card_name: renewTarget.name,
        category: renewTarget.category,
        renewal_amount: renewalAmount,
        auto_renew: renewAutoRenew && renewalAmount !== 0,
      });
      setRenewTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be renewed.");
    } finally {
      setBusyId(null);
    }
  };

  const cancelAutoRenew = async (card: OwnerCard) => {
    if (!onCancelAutoRenew) return;
    setBusyId(String(card.id));
    setError(null);
    try {
      await onCancelAutoRenew(card);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel auto-renew.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dashboard-backdrop" onMouseDown={(event) => event.target === event.currentTarget && handleClose()}>
      <section className="owner-dashboard" aria-label="Your card dashboard">
        <header className="dashboard-header">
          <div><span>YOUR WALL</span><h2>My Board</h2></div>
          <button className="icon-btn" onClick={handleClose} aria-label="Close dashboard"><X /></button>
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
                  placeholder={profile?.username ?? profile?.displayName ?? "Your name or handle"}
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
          {!profile?.verified ? (
            <div className="dashboard-verification-header">
              <span className="verified-badge dashboard-verification-badge-preview">✓ Verified Business Badge</span>
            </div>
          ) : null}
          {profile?.verified ? (
            <div className="dashboard-verification-active">
              <span className="verified-badge dashboard-verified-badge-lg">✓ Verified Business</span>
              <p>Your checkmark badge appears on all your cards.</p>
            </div>
          ) : profile?.verificationStatus === "pending" ? (
            <div className="dashboard-verification-status">
              <span className="verification-status-tag pending">Under Review</span>
              <p>Our team is reviewing your request. Your badge will go live within 24 hours of approval.</p>
            </div>
          ) : (
            <div className="dashboard-verification-cta">
              {profile?.verificationStatus === "rejected" ? (
                <><span className="verification-status-tag rejected">Not Approved</span><p>Your last request was not approved. You can submit a new request below.</p></>
              ) : (
                <p>Get a ✓ verified checkmark on all your cards — builds trust and drives more clicks.</p>
              )}
              <div className="verification-plans">
                <button
                  className={`verification-plan${selectedVerificationPlan === "monthly" ? " verification-plan-selected" : ""}`}
                  onClick={() => setSelectedVerificationPlan("monthly")}
                  disabled={verificationBusy || !onRequestVerification}
                  aria-pressed={selectedVerificationPlan === "monthly"}
                >
                  {selectedVerificationPlan === "monthly" ? <Check size={11} className="plan-check" /> : null}
                  <strong>$4.99 / mo</strong><span>Monthly</span>
                </button>
                <button
                  className={`verification-plan verification-plan-featured${selectedVerificationPlan === "annual" ? " verification-plan-selected" : ""}`}
                  onClick={() => setSelectedVerificationPlan("annual")}
                  disabled={verificationBusy || !onRequestVerification}
                  aria-pressed={selectedVerificationPlan === "annual"}
                >
                  {selectedVerificationPlan === "annual" ? <Check size={11} className="plan-check" /> : null}
                  <strong>$19.99 / yr</strong><span>Annual — save 66%</span>
                </button>
                <button
                  className="primary verification-purchase-btn"
                  disabled={!selectedVerificationPlan || verificationBusy || !onRequestVerification}
                  onClick={() => { if (selectedVerificationPlan) void requestVerification(selectedVerificationPlan); }}
                >
                  {verificationBusy ? "…" : "Get Verified"}
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
                <div className={`dashboard-card-thumb theme-${card.theme}`}>{card.thumbnailImages?.[0] || card.images[0] ? <Image src={card.thumbnailImages?.[0] ?? card.images[0]} alt="" fill sizes="94px" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} /> : <span>{card.name.slice(0, 1)}</span>}</div>
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
                    <button className="secondary" onClick={() => { onNavigateToWall(wall); handleClose(); }}>Visit</button>
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
                  <div className={`dashboard-card-thumb theme-${card.theme}`}>{card.images[0] ? <Image src={card.images[0]} alt="" fill sizes="94px" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} /> : <span>{card.name.slice(0, 1)}</span>}</div>
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
                    <button className="secondary" disabled={expired} onClick={() => setPreviewTarget(card)}><Eye size={13} /> Preview</button>
                    <button className="secondary" disabled={busy} onClick={() => setEditingCard(card)}><Pencil /> Edit</button>
                    <button className="secondary" disabled={busy} onClick={() => { setRenewTarget(card); setRenewalAmount(7.99); setRenewAutoRenew(false); }}><RefreshCw /> Renew</button>
                    {card.autoRenew ? <button className="secondary auto-renew-cancel-btn" disabled={busy} onClick={() => cancelAutoRenew(card)} title="Cancel auto-renew"><RefreshCw size={12} className="auto-renew-icon" /> Auto-renewing</button> : null}
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
        {renewTarget ? (
          <div className="dashboard-confirm-backdrop">
            <div className="dashboard-confirm renewal-dialog" role="dialog" aria-modal="true" aria-labelledby="renew-card-title">
              <RefreshCw />
              <h3 id="renew-card-title">Renew {renewTarget.name}</h3>
              <p>Choose how much time to add. Time is added after the current expiration date when the card is still active.</p>
              <div className="renewal-options" role="radiogroup" aria-label="Renewal duration">
                {renewalOptions.map((option) => (
                  <button key={option.amount} type="button" role="radio" aria-checked={renewalAmount === option.amount} className={`renewal-option ${renewalAmount === option.amount ? "selected" : ""}`} onClick={() => setRenewalAmount(option.amount)}>
                    <strong>{option.price}</strong><span>{option.duration}</span>{renewalAmount === option.amount ? <Check /> : null}
                  </button>
                ))}
              </div>
              {renewalAmount !== 0 ? (
                <label className="renewal-auto-renew-row">
                  <input type="checkbox" checked={renewAutoRenew} onChange={(e) => setRenewAutoRenew(e.target.checked)} />
                  <span>Auto-renew when it expires</span>
                </label>
              ) : null}
              <div className="renewal-actions">
                <button className="secondary" onClick={() => setRenewTarget(null)} disabled={busyId !== null}>Cancel</button>
                <button className="primary" onClick={renewCard} disabled={busyId !== null}>{busyId ? "Starting…" : renewalAmount === 0 ? "Renew free" : `Continue for $${renewalAmount}`}</button>
              </div>
            </div>
          </div>
        ) : null}
        {editingCard ? <EditCardModal card={editingCard} onClose={() => setEditingCard(null)} onSave={onUpdate} /> : null}
        {previewTarget ? (() => {
          const card = previewTarget;
          const locationParts = [card.area, card.city, card.state].filter(Boolean).join(", ");
          const image = card.thumbnailImages?.[0] ?? card.images[0];
          return (
            <div className="dashboard-confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setPreviewTarget(null)}>
              <div className="card-preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-card-title">
                {image ? (
                  <div className="card-preview-image"><img src={image} alt={card.name} /></div>
                ) : (
                  <div className={`card-preview-swatch theme-${card.theme}`} aria-hidden="true" />
                )}
                <div className="card-preview-body">
                  <div className="card-preview-meta">
                    <span className="card-preview-category">{card.category}{card.subcategory ? ` · ${card.subcategory}` : ""}</span>
                    {card.verified ? <span className="embed-verified">✓ Verified</span> : null}
                  </div>
                  <h3 id="preview-card-title" className="card-preview-name">{card.name}</h3>
                  <p className="card-preview-line">{card.line}</p>
                  {locationParts ? <p className="card-preview-location">{locationParts}</p> : null}
                  {card.price ? <p className="card-preview-price">{card.price}</p> : null}
                  {card.message ? <p className="card-preview-message">{card.message}</p> : null}
                  {card.website ? (
                    <div className="card-preview-actions">
                      <a className="embed-action" href={card.website} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.96 6.96 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7.03 7.03 0 0 0 2.072 2.472zM3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7.03 7.03 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a6.96 6.96 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.03 7.03 0 0 0-2.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/></svg>Website</a>
                    </div>
                  ) : null}
                </div>
                <div className="card-preview-footer">
                  <button className="secondary" onClick={() => setPreviewTarget(null)}>Close</button>
                  <button className="primary" onClick={() => { setPreviewTarget(null); setRenewTarget(card); setRenewalAmount(7.99); }}><RefreshCw size={13} /> Renew card</button>
                </div>
              </div>
            </div>
          );
        })() : null}
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
