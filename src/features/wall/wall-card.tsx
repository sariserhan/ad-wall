"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { getCardFormat, type WallCard as WallCardModel } from "./types";

interface WallCardProps {
  card: WallCardModel;
  active: boolean;
  onOpen: (card: WallCardModel) => void;
  onFront: (id: string) => void;
  ownerDraggable?: boolean;
  dragging?: boolean;
  onDragStart?: (event: PointerEvent<HTMLElement>, card: WallCardModel) => void;
  onDragMove?: (event: PointerEvent<HTMLElement>, card: WallCardModel) => void;
  onDragEnd?: (event: PointerEvent<HTMLElement>, card: WallCardModel) => void;
  zIndex: number;
}

type CardStyle = CSSProperties & Record<"--x" | "--y" | "--r" | "--w" | "--h" | "--tape-w" | "--tape-r" | "--tape-l", string>;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function WallCard({ card, active, onOpen, onFront, ownerDraggable = false, dragging = false, onDragStart, onDragMove, onDragEnd, zIndex }: WallCardProps) {
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const seed = hashString(String(card.id));
  const tapeWidth = 42 + (seed % 45); // 42px to 86px
  const tapeRotate = -14 + ((seed >> 3) % 23); // -14deg to +8deg
  const tapeLeft = 22 + ((seed >> 6) % 48); // 22% to 69%
  const displayTheme = card.imageMode === "business-card" ? "biz" : card.theme;
  const cardImage = card.thumbnailImages?.[0] ?? card.images[0];
  const format = getCardFormat(displayTheme);

  const style: CardStyle = {
    "--x": `${card.x}%`,
    "--y": `${card.y}px`,
    "--r": `${card.rotation}deg`,
    "--w": `${format.width}px`,
    "--h": `${format.minHeight}px`,
    "--tape-w": `${tapeWidth}px`,
    "--tape-r": `${tapeRotate}deg`,
    "--tape-l": `${tapeLeft}%`,
    zIndex,
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(card);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    onFront(card.id);
    if (!ownerDraggable || event.button !== 0) return;
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragStart?.(event, card);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = pointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) didDragRef.current = true;
    if (didDragRef.current) onDragMove?.(event, card);
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const start = pointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onDragEnd?.(event, card);
  };

  return (
    <article
      className={`wall-card theme-${displayTheme} ${card.imageMode === "business-card" && cardImage ? "image-business-card" : ""} ${active ? "is-active" : ""} ${ownerDraggable ? "is-owner-card" : ""} ${dragging ? "is-owner-dragging" : ""}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={(event) => {
        if (didDragRef.current) {
          event.preventDefault();
          didDragRef.current = false;
          return;
        }
        onOpen(card);
      }}
      tabIndex={0}
      role="button"
      onKeyDown={handleKeyDown}
      title={ownerDraggable ? "Drag to reposition your card" : undefined}
      aria-label={ownerDraggable ? `Your advertisement for ${card.name}. Drag to reposition or activate to open.` : `Open advertisement for ${card.name}`}
    >
      <span className="card-tape" aria-hidden="true" />
      <div className="card-copy">
        <p className="card-category">{card.category}</p>
        <h2>{card.name}</h2>
        <p className="card-line">{card.line}</p>
      </div>
      {cardImage ? <img src={cardImage} alt="" draggable="false" loading="lazy" decoding="async" /> : null}
      <footer>
        <span>{card.area}</span>
        {card.price ? <strong>{card.price}</strong> : null}
      </footer>
      {card.ownerName ? <span className="card-owner" aria-label={`Posted by ${card.ownerName}`}>{card.ownerName}</span> : null}
    </article>
  );
}
