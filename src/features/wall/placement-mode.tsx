"use client";

import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { useRef, type CSSProperties, type PointerEvent } from "react";
import { getCardFormat, getImageCardFormat, type CardDraft, type Placement } from "./types";

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
  onRotate: (rotation: number) => void;
  isSaving: boolean;
}

export function PlacementMode({ card, position, dragging, onDragStart, onMove, onDragEnd, onCancel, onRandom, onConfirm, onRotate, isSaving }: PlacementModeProps) {
  const displayTheme = card.imageMode === "business-card" ? "biz" : card.theme;
  const format = card.imageMode === "business-card" ? getCardFormat("biz") : getImageCardFormat(card.theme, card.imageMode);
  const imageTopLayout = Boolean(card.previews[0] && card.imageMode !== "business-card" && displayTheme !== "biz" && displayTheme !== "ticket");
  const tiltPointerRef = useRef<{ id: number; x: number; y: number; rotation: number } | null>(null);

  const handleTiltPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    tiltPointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: card.rotation ?? 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTiltPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = tiltPointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    const delta = (event.clientX - start.x) * 0.45 - (event.clientY - start.y) * 0.18;
    const next = Math.max(-90, Math.min(90, Math.round(start.rotation + delta)));
    if (next !== card.rotation) onRotate(next);
  };

  const handleTiltPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const start = tiltPointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    tiltPointerRef.current = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
  };

  return (
    <div className="placement-mode" onPointerMove={onMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
      <div className="placement-banner">
        <div><strong>Choose your one spot</strong><span>Drag the card anywhere on the wall. Once posted, it stays put.</span></div>
        <button className="placement-random" onClick={onRandom} disabled={isSaving}><Sparkles /> Find me a spot</button>
        <button className="primary" onClick={onConfirm} disabled={isSaving}><Check /> {isSaving ? "Sticking…" : "Stick it here"}</button>
        <button className="icon-btn" onClick={onCancel} disabled={isSaving} aria-label="Cancel placement"><X /></button>
      </div>
      <article
        className={`wall-card placement-card theme-${displayTheme} ${imageTopLayout ? "image-top-layout" : ""} ${card.imageMode === "business-card" && card.previews[0] ? "image-business-card" : ""} ${dragging ? "is-dragging" : ""}`}
        style={{ left: `${position.x}%`, top: `${position.y}px`, "--w": `${format.width}px`, "--h": `${format.minHeight}px`, "--r": `${card.rotation ?? 0}deg` } as CSSProperties}
        onPointerDown={onDragStart}
      >
        <button
          type="button"
          className="wall-card-tilt-handle"
          onPointerDown={handleTiltPointerDown}
          onPointerMove={handleTiltPointerMove}
          onPointerUp={handleTiltPointerEnd}
          onPointerCancel={handleTiltPointerEnd}
          aria-label="Tilt while placing"
          title="Hold and drag to tilt"
        >
          <RotateCcw size={12} />
        </button>
        <span className="card-tape" aria-hidden="true" />
        {imageTopLayout ? (
          <>
            <div className="wall-card-image-top-wrap">
              <img src={card.previews[0]} alt="" draggable={false} className="wall-card-image-top" />
            </div>
            <div className="wall-card-content">
              <div className="card-copy"><p className="card-category">{card.category}</p><h2>{card.name}</h2><p className="card-line">{card.line}</p></div>
            </div>
          </>
        ) : (
          <>
            <div className="card-copy"><p className="card-category">{card.category}</p><h2>{card.name}</h2><p className="card-line">{card.line}</p></div>
            {card.previews[0] ? <img src={card.previews[0]} alt="" draggable="false" /> : null}
          </>
        )}
        <footer><span>{card.area}</span>{card.price ? <strong>{card.price}</strong> : null}</footer>
        <div className="drag-label">DRAG ME</div>
      </article>
    </div>
  );
}
