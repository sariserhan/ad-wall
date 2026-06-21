"use client";

import { Bookmark, ExternalLink, Flag, Mail, Phone, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WallCard } from "./types";
import { SocialLinks } from "./social-links";

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

type CardEvent = "website" | "phone" | "email" | "social" | "save" | "share";

export function DetailPanel({ card, onClose, viewCount, onEvent, onReport }: {
  card: WallCard;
  onClose: () => void;
  viewCount: number;
  onEvent?: (event: CardEvent) => void;
  onReport?: (reason: "spam" | "scam" | "inappropriate" | "expired" | "other", details?: string) => Promise<void>;
}) {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const savedCards = JSON.parse(window.localStorage.getItem("savedWallCards") ?? "[]") as string[];
      return savedCards.includes(String(card.id));
    } catch {
      return false;
    }
  });
  const [revealedPhoneFor, setRevealedPhoneFor] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const phoneRevealed = revealedPhoneFor === String(card.id);

  useEffect(() => {
    if (!expandedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedImage]);

  const toggleSaved = () => {
    const cardId = String(card.id);
    try {
      const savedCards = JSON.parse(window.localStorage.getItem("savedWallCards") ?? "[]") as string[];
      const next = savedCards.includes(cardId) ? savedCards.filter((id) => id !== cardId) : [...savedCards, cardId];
      window.localStorage.setItem("savedWallCards", JSON.stringify(next));
      setSaved(next.includes(cardId));
      if (next.includes(cardId)) onEvent?.("save");
    } catch {
      setSaved((value) => !value);
    }
  };

  const shareCard = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("card", String(card.id));
    const shareData = { title: card.name, text: card.line, url: url.toString() };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(url.toString());
    onEvent?.("share");
  };

  const report = async () => {
    const details = window.prompt("Why are you reporting this card? Describe spam, a scam, inappropriate content, or an expired listing.");
    if (!details?.trim() || !onReport) return;
    await onReport("other", details.trim());
    window.alert("Thanks. The report was sent to the WALL moderation queue.");
  };

  const hasContact = Boolean(card.phone || card.email || card.website);

  return (
    <aside className="detail-sheet" aria-label={`${card.name} details`}>
      <div className="sheet-pin" />
      <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close details"><X /></button>
      <p className="sheet-category">{card.category} · {card.area}</p>
      <h2>{card.name}</h2>
      <div className="rule" />
      <p className="sheet-service">{card.line}</p>
      {card.images.length ? (
        <div className={card.images.length > 1 ? "sheet-images sheet-images-double" : "sheet-images"}>
          {card.images.map((image, index) => (
            <button className="sheet-image-button" type="button" onClick={() => setExpandedImage(image)} aria-label={`View ${card.name} image ${index + 1} full screen`} key={image}>
              <img className="sheet-image" src={image} alt={`${card.name} service ${index + 1}`} />
              <span>View full screen</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="note-copy">{card.message ?? card.line}</div>
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
      <button className={`secondary wide ${saved ? "is-saved" : ""}`} onClick={toggleSaved} aria-pressed={saved}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save card"}</button>
      <div className="detail-secondary-actions">
        <button type="button" className="secondary" onClick={() => void shareCard()}><Share2 /> Share</button>
        {onReport ? <button type="button" className="secondary" onClick={() => void report()}><Flag /> Report</button> : null}
      </div>
      <div className="sheet-meta"><span>{viewCount > 0 ? `${viewCount} views` : "No views yet"}</span><span>CARD #{String(card.id).slice(-6).toUpperCase()}</span></div>
      {expandedImage ? createPortal(
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`${card.name} image preview`} onMouseDown={(event) => event.target === event.currentTarget && setExpandedImage(null)}>
          <button className="image-lightbox-close" type="button" onClick={() => setExpandedImage(null)} aria-label="Close full-screen image" autoFocus><X /></button>
          <img src={expandedImage} alt={`${card.name} full-screen preview`} />
        </div>,
        document.body,
      ) : null}
    </aside>
  );
}
