"use client";

import { Bookmark, MessageSquare, X } from "lucide-react";
import type { WallCard } from "./types";

export function DetailPanel({ card, onClose, viewCount, onSendBehind }: { card: WallCard; onClose: () => void; viewCount: number; onSendBehind?: () => void }) {
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
      <button className="primary wide"><MessageSquare /> Contact {card.name.split(" ").slice(0, 2).join(" ")}</button>
      {onSendBehind ? <button className="secondary wide" onClick={onSendBehind}>Send behind</button> : null}
      <button className="secondary wide"><Bookmark /> Save card</button>
      <div className="sheet-meta"><span>{viewCount > 0 ? `${viewCount} views` : "No views yet"}</span><span>CARD #{String(card.id).slice(-6).toUpperCase()}</span></div>
    </aside>
  );
}
