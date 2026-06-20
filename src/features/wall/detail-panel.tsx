"use client";

import { Bookmark, Contact, ExternalLink, Mail, Phone, X } from "lucide-react";
import { useState } from "react";
import type { WallCard } from "./types";
import { SocialLinks } from "./social-links";

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export function DetailPanel({ card, onClose, viewCount, onSendBehind }: { card: WallCard; onClose: () => void; viewCount: number; onSendBehind?: () => void }) {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const savedCards = JSON.parse(window.localStorage.getItem("savedWallCards") ?? "[]") as string[];
      return savedCards.includes(String(card.id));
    } catch {
      return false;
    }
  });

  const toggleSaved = () => {
    const cardId = String(card.id);
    try {
      const savedCards = JSON.parse(window.localStorage.getItem("savedWallCards") ?? "[]") as string[];
      const next = savedCards.includes(cardId) ? savedCards.filter((id) => id !== cardId) : [...savedCards, cardId];
      window.localStorage.setItem("savedWallCards", JSON.stringify(next));
      setSaved(next.includes(cardId));
    } catch {
      setSaved((value) => !value);
    }
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
          {card.images.map((image, index) => <img className="sheet-image" src={image} alt={`${card.name} service ${index + 1}`} key={image} />)}
        </div>
      ) : null}
      <div className="note-copy">{card.message ?? card.line}</div>
      {card.price ? <div className="sheet-price">Starting at <strong>{card.price}</strong></div> : null}
      {hasContact ? (
        <div className="contact-actions" aria-label={`Contact ${card.name}`}>
          {card.phone ? <a className="primary contact-action" href={`tel:${card.phone}`}><Phone /> Call</a> : null}
          {card.email ? <a className="secondary contact-action" href={`mailto:${card.email}?subject=${encodeURIComponent(`Saw your card on WALL`)}`}><Mail /> Email</a> : null}
          {card.website ? <a className="secondary contact-action" href={websiteHref(card.website)} target="_blank" rel="noreferrer"><ExternalLink /> Website</a> : null}
        </div>
      ) : <p className="contact-unavailable">This poster has not added public contact details yet.</p>}
      <SocialLinks card={card} />
      {onSendBehind ? <button className="secondary wide" onClick={onSendBehind}><Contact></Contact>Contact {card.name}</button> : null}
      <button className={`secondary wide ${saved ? "is-saved" : ""}`} onClick={toggleSaved} aria-pressed={saved}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save card"}</button>
      <div className="sheet-meta"><span>{viewCount > 0 ? `${viewCount} views` : "No views yet"}</span><span>CARD #{String(card.id).slice(-6).toUpperCase()}</span></div>
    </aside>
  );
}
