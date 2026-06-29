"use client";

import { Bookmark, Copy, ExternalLink, Eye, Flag, Heart, Mail, Phone, QrCode, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { WallCard } from "./types";
import { ImageSwapViewer } from "./image-compare-slider";
import { SocialLinks } from "./social-links";
import { ReviewsSection } from "./reviews-section";
import { toast } from "@/lib/toast";
import { BLUR_PLACEHOLDER } from "@/lib/blur-placeholder";

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.852L.057 23.886a.75.75 0 0 0 .918.919l6.105-1.48A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.37l-.36-.214-3.724.902.922-3.63-.235-.374A9.818 9.818 0 1 1 12 21.818z"/>
    </svg>
  );
}

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

type CardEvent = "website" | "phone" | "email" | "social" | "save" | "share";
type ReportReason = "spam" | "scam" | "inappropriate" | "expired" | "other";

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Repeated, irrelevant, or unsolicited content" },
  { value: "scam", label: "Scam", description: "Fraudulent or misleading listing" },
  { value: "inappropriate", label: "Inappropriate", description: "Adult, offensive, or unsafe content" },
  { value: "expired", label: "Expired", description: "Service no longer available" },
  { value: "other", label: "Other", description: "Something else not listed above" },
];

export function DetailPanel({ card, onClose, viewCount, onEvent, onReport, canSaveCard = true, saved = false, onSetSaved, onRequestSignIn, liked = false, canLike = true, onToggleLike, similarCards = [], onCardOpen }: {
  card: WallCard;
  onClose: () => void;
  viewCount: number;
  onEvent?: (event: CardEvent) => void;
  onReport?: (reason: "spam" | "scam" | "inappropriate" | "expired" | "other", details?: string) => Promise<void>;
  canSaveCard?: boolean;
  saved?: boolean;
  onSetSaved?: (saved: boolean) => Promise<void>;
  onRequestSignIn?: () => void;
  liked?: boolean;
  canLike?: boolean;
  onToggleLike?: () => Promise<void>;
  similarCards?: WallCard[];
  onCardOpen?: (card: WallCard) => void;
}) {
  const [optimisticSaved, setOptimisticSaved] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(liked);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(card.likes ?? 0);
  const [liking, setLiking] = useState(false);
  const [revealedPhoneFor, setRevealedPhoneFor] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const swipeX = useRef(0);
  const swipeY = useRef(0);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const reportFirstRef = useRef<HTMLButtonElement>(null);
  const phoneRevealed = revealedPhoneFor === String(card.id);
  const frontImage = card.thumbnailImages?.[0] ?? card.images[0];
  const backImage = card.backThumbnailImages?.[0] ?? card.backImages?.[0];
  const backLayout = card.theme === "photo" ? "photo" : "full";

  useEffect(() => setOptimisticSaved(saved), [saved]);
  useEffect(() => { setOptimisticLiked(liked); }, [liked]);
  useEffect(() => { setOptimisticLikeCount(card.likes ?? 0); }, [card.likes]);

  useEffect(() => {
    if (!expandedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedImage]);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShareMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setShareMenuOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleEscape); };
  }, [shareMenuOpen]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.scrollTop = 0;
  }, [card.id]);

  const handleToggleLike = async () => {
    if (!onToggleLike || liking) return;
    const next = !optimisticLiked;
    setOptimisticLiked(next);
    setOptimisticLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setLiking(true);
    try {
      await onToggleLike();
    } catch {
      setOptimisticLiked(!next);
      setOptimisticLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setLiking(false);
    }
  };

  const toggleSaved = async () => {
    if (!onSetSaved || saving) return;
    const next = !optimisticSaved;
    setOptimisticSaved(next);
    setSaving(true);
    try {
      await onSetSaved(next);
      if (next) onEvent?.("save");
      toast(next ? "Card saved" : "Card removed");
    } catch {
      setOptimisticSaved(!next);
    } finally {
      setSaving(false);
    }
  };

  const buildCardUrl = () => {
    const url = new URL("/", window.location.origin);
    if (card.country) url.searchParams.set("country", card.country);
    if (card.state) url.searchParams.set("state", card.state);
    if (card.city) url.searchParams.set("city", card.city);
    const rawId = String(card.id);
    const cleanId = rawId.length > 32 ? rawId.slice(0, 32) : rawId;
    url.searchParams.set("card", cleanId);
    return url.toString();
  };

  const sharingRef = useRef(false);
  const handleShareClick = async () => {
    const url = buildCardUrl();
    if (navigator.share) {
      if (sharingRef.current) return;
      sharingRef.current = true;
      try {
        await navigator.share({ title: card.name, url });
        onEvent?.("share");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      } finally {
        sharingRef.current = false;
      }
    } else {
      setShareMenuOpen((o) => !o);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(buildCardUrl());
    onEvent?.("share");
    setShareMenuOpen(false);
    toast("Link copied", "info");
  };

  const shareOnWhatsApp = () => {
    const url = buildCardUrl();
    const text = `${card.name}${card.line ? ` — ${card.line}` : ""}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    onEvent?.("share");
    setShareMenuOpen(false);
  };

  const openQr = async () => {
    setQrOpen(true);
    setQrDataUrl(null);
    onEvent?.("share");
    const url = buildCardUrl();
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#111111", light: "#f5f1e8" } });
    setQrDataUrl(dataUrl);
  };

  const openReport = () => {
    setReportReason("spam");
    setReportDetails("");
    setReportDone(false);
    setReportOpen(true);
    window.setTimeout(() => reportFirstRef.current?.focus(), 50);
  };

  const submitReport = async () => {
    if (!onReport || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await onReport(reportReason, reportDetails.trim() || undefined);
      setReportDone(true);
    } finally {
      setReportSubmitting(false);
    }
  };

  const hasContact = Boolean(card.phone || card.email || card.website);

  return (
    <aside
      ref={sheetRef}
      className="detail-sheet"
      aria-label={`${card.name} details`}
      onTouchStart={(e) => { swipeX.current = e.touches[0].clientX; swipeY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - swipeX.current;
        const dy = e.changedTouches[0].clientY - swipeY.current;
        if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 60) return;
        if (dx > 0 && canSaveCard && !optimisticSaved) void toggleSaved();
        else if (dx < 0) onClose();
      }}
    >
      <div className="sheet-pin" />
      <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close details"><X /></button>
      <p className="sheet-category">{card.category} · {card.area}</p>
      {card.ownerName ? (
        <p className="sheet-byline">
          by {card.ownerName}
          {(card.verified || card.imageMode === "business-card") ? <span className="sheet-verified" aria-label="Verified business">✓ Verified</span> : null}
        </p>
      ) : (card.verified || card.imageMode === "business-card") ? <p className="sheet-byline"><span className="sheet-verified" aria-label="Verified business">✓ Verified</span></p> : null}
      <h2>{card.name}</h2>
      <div className="rule" />
      <p className="sheet-service">{card.line}</p>
      <ImageSwapViewer
        frontSrc={frontImage}
        backSrc={backImage}
        frontAlt={`${card.name} front image`}
        backAlt={`${card.name} back image`}
        className="sheet-image-swap-wrap"
        layout={backLayout}
      />
      {card.message ? <div className="note-copy">{card.message}</div> : null}
      {card.price ? <div className="sheet-price">Starting at <strong>{card.price}</strong></div> : null}
      {hasContact ? (
        <div className="contact-actions" aria-label={`Contact ${card.name}`}>
          {card.phone ? <button type="button" className={`primary contact-action call-desktop${phoneRevealed ? " is-revealed" : ""}`} onClick={() => { setRevealedPhoneFor(String(card.id)); onEvent?.("phone"); }}><Phone /> {phoneRevealed ? card.phone : "Show phone"}</button> : null}
          {card.phone ? <a className="primary contact-action call-mobile" href={`tel:${card.phone}`} onClick={() => onEvent?.("phone")}><Phone /> Call</a> : null}
          {card.email ? <a className="secondary contact-action" href={`mailto:${card.email}?subject=${encodeURIComponent(`Saw your card on WALL`)}`} onClick={() => onEvent?.("email")}><Mail /> Email</a> : null}
          {card.website ? <a className="secondary contact-action" href={websiteHref(card.website)} target="_blank" rel="noreferrer" onClick={() => onEvent?.("website")}><ExternalLink /> Website</a> : null}
        </div>
      ) : <p className="contact-unavailable">This poster has not added public contact details yet.</p>}
      <SocialLinks card={card} onVisit={() => onEvent?.("social")} />
      <div className="detail-card-actions">
        {canSaveCard ? <button className={`secondary ${optimisticSaved ? "is-saved" : ""}`} onClick={() => void toggleSaved()} aria-pressed={optimisticSaved} disabled={saving}><Bookmark fill={optimisticSaved ? "currentColor" : "none"} /> {saving ? "Saving…" : optimisticSaved ? "Saved" : "Save"}</button> : null}
        {canLike ? <button className={`secondary like-btn${optimisticLiked ? " is-liked" : ""}`} onClick={() => { if (!onToggleLike) { onRequestSignIn?.(); return; } void handleToggleLike(); }} aria-pressed={optimisticLiked} disabled={liking}><Heart fill={optimisticLiked ? "currentColor" : "none"} /> {optimisticLikeCount > 0 ? optimisticLikeCount : "Like"}</button> : null}
      </div>
      <div className="detail-secondary-actions">
        <div className="share-menu-wrap" ref={shareMenuRef}>
          <button type="button" className="secondary" onClick={() => void handleShareClick()}><Share2 /> Share</button>
          {shareMenuOpen ? (
            <div className="share-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => void copyLink()}><Copy size={14} /> Copy link</button>
              <button type="button" role="menuitem" className="share-menu-whatsapp" onClick={shareOnWhatsApp}><WhatsAppIcon /> WhatsApp</button>
            </div>
          ) : null}
        </div>
        <button type="button" className="secondary" onClick={() => void openQr()}><QrCode size={15} /> QR Code</button>
        {onReport ? <button type="button" className="secondary" onClick={openReport}><Flag /> Report</button> : null}
      </div>
      <div className="sheet-meta"><span><Eye size={12} /> {viewCount > 0 ? viewCount : 0}{optimisticLikeCount > 0 ? <> · <Heart size={12} fill="currentColor" style={{ color: "#f43d38" }} /> {optimisticLikeCount}</> : null}</span><span>CARD #{String(card.id).slice(-6).toUpperCase()}</span></div>
      <ReviewsSection cardId={card.id} onRequestSignIn={onRequestSignIn} />
      {similarCards.length > 0 ? (
        <div className="similar-cards">
          <h4 className="similar-cards-heading">Similar listings</h4>
          <div className="similar-cards-list">
            {similarCards.map((sc) => (
              <button key={String(sc.id)} type="button" className={`similar-card theme-${sc.imageMode === "business-card" ? "biz" : sc.theme}`} onClick={() => onCardOpen?.(sc)}>
                {sc.thumbnailImages?.[0] && <Image src={sc.thumbnailImages[0]} alt="" aria-hidden fill sizes="90px" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />}
                <span className="similar-card-category">{sc.category}</span>
                <strong>{sc.name}</strong>
                {sc.line ? <span className="similar-card-line">{sc.line}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {qrOpen ? createPortal(
        <div className="dashboard-confirm-backdrop qr-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setQrOpen(false)}>
          <div className="qr-modal" role="dialog" aria-modal="true" aria-label="QR code for this card">
            <div className="qr-modal-tape" />
            <button className="icon-btn qr-modal-close" type="button" onClick={() => setQrOpen(false)} aria-label="Close"><X /></button>
            <h3 className="qr-modal-title">Scan to view card</h3>
            <p className="qr-modal-name">{card.name}</p>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt={`QR code for ${card.name}`} className="qr-modal-image" width={220} height={220} />
                <a href={qrDataUrl} download={`${card.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-qr.png`} className="primary qr-download-btn">Download PNG</a>
              </>
            ) : (
              <div className="qr-modal-loading">Generating…</div>
            )}
            <button type="button" className="secondary" onClick={() => setQrOpen(false)}>Close</button>
          </div>
        </div>,
        document.body,
      ) : null}
      {expandedImage ? createPortal(
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`${card.name} image preview`} onMouseDown={(event) => event.target === event.currentTarget && setExpandedImage(null)}>
          <button className="image-lightbox-close" type="button" onClick={() => setExpandedImage(null)} aria-label="Close full-screen image" autoFocus><X /></button>
          <img src={expandedImage} alt={`${card.name} full-screen preview`} />
        </div>,
        document.body,
      ) : null}
      {reportOpen ? createPortal(
        <div
          className="dashboard-confirm-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setReportOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setReportOpen(false)}
        >
          <div className="dashboard-confirm report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
            <Flag size={34} />
            <h3 id="report-modal-title">Report this card</h3>
            {reportDone ? (
              <>
                <p>Thanks — your report was sent to the moderation queue.</p>
                <div style={{ gridTemplateColumns: "1fr" }}>
                  <button className="primary" onClick={() => setReportOpen(false)}>Close</button>
                </div>
              </>
            ) : (
              <>
                <div className="report-modal-reasons" role="radiogroup" aria-label="Report reason">
                  {REPORT_REASONS.map(({ value, label, description }, i) => (
                    <button
                      key={value}
                      ref={i === 0 ? reportFirstRef : undefined}
                      type="button"
                      role="radio"
                      aria-checked={reportReason === value}
                      className={`report-reason-btn${reportReason === value ? " selected" : ""}`}
                      onClick={() => setReportReason(value)}
                    >
                      <strong>{label}</strong>
                      <span>{description}</span>
                    </button>
                  ))}
                </div>
                <label className="report-details-label">
                  Additional details <span>(optional)</span>
                  <textarea
                    className="report-details-textarea"
                    maxLength={500}
                    rows={3}
                    placeholder="Anything else the moderation team should know?"
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                  />
                </label>
                <div>
                  <button className="secondary" onClick={() => setReportOpen(false)} disabled={reportSubmitting}>Cancel</button>
                  <button className="primary danger-confirm" onClick={() => void submitReport()} disabled={reportSubmitting}>
                    {reportSubmitting ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </aside>
  );
}
