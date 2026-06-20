"use client";

import { Check, Sparkles, X } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { getCardFormat, type CardDraft, type Placement } from "./types";

interface PlacementModeProps {
  card: CardDraft;
  position: Placement;
  dragging: boolean;
  onDragStart: (event: PointerEvent<HTMLElement>) => void;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onCancel: () => void;
  onRandom: () => void;
  onConfirm: () => void;
  isSaving: boolean;
}

export function PlacementMode({ card, position, dragging, onDragStart, onMove, onDragEnd, onCancel, onRandom, onConfirm, isSaving }: PlacementModeProps) {
  const format = getCardFormat(card.theme);

  return (
    <div className="placement-mode" onPointerMove={onMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
      <div className="placement-banner">
        <div><strong>Choose your one spot</strong><span>Drag the card anywhere on the wall. Once posted, it stays put.</span></div>
        <button className="placement-random" onClick={onRandom} disabled={isSaving}><Sparkles /> Find me a spot</button>
        <button className="primary" onClick={onConfirm} disabled={isSaving}><Check /> {isSaving ? "Sticking…" : "Stick it here"}</button>
        <button className="icon-btn" onClick={onCancel} disabled={isSaving} aria-label="Cancel placement"><X /></button>
      </div>
      <article
        className={`wall-card placement-card theme-${card.theme} ${dragging ? "is-dragging" : ""}`}
        style={{ left: `${position.x}%`, top: `${position.y}px`, "--w": `${format.width}px`, "--h": `${format.minHeight}px` } as CSSProperties}
        onPointerDown={onDragStart}
      >
        <span className="card-tape" aria-hidden="true" />
        <div className="card-copy"><p className="card-category">{card.category}</p><h2>{card.name}</h2><p className="card-line">{card.line}</p></div>
        {card.previews[0] ? <img src={card.previews[0]} alt="" draggable="false" /> : null}
        <footer><span>{card.area}</span>{card.price ? <strong>{card.price}</strong> : null}</footer>
        <div className="drag-label">DRAG ME</div>
      </article>
    </div>
  );
}
