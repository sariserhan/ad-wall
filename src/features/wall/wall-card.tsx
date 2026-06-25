"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import { getCardFormat, type WallCard as WallCardModel } from "./types";
import { BLUR_PLACEHOLDER } from "@/lib/blur-placeholder";

interface WallCardProps {
  card: WallCardModel;
  active: boolean;
  onOpen: (card: WallCardModel) => void;
  onFront: (id: string) => void;
  ownerDraggable?: boolean;
  expiringSoon?: boolean;
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

export function WallCard({ card, active, onOpen, onFront, ownerDraggable = false, expiringSoon = false, dragging = false, onDragStart, onDragMove, onDragEnd, zIndex }: WallCardProps) {
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
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
    onDragEnd?.(event, card);
  };

  return (
    <article
      className={`wall-card theme-${displayTheme} ${card.imageMode === "business-card" && cardImage ? "image-business-card" : ""} ${active ? "is-active" : ""} ${ownerDraggable ? "is-owner-card" : ""} ${dragging ? "is-owner-dragging" : ""} ${card.featuredTier ? `featured-${card.featuredTier}` : ""} ${expiringSoon ? "is-expiring-soon" : ""}`}
      data-card-id={card.id}
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
      {expiringSoon ? <span className="card-expiry-warn" aria-label="This card is expiring soon — open your dashboard to renew">⚠ Renew</span> : null}
      {card.featuredTier === "gold" ? <span className="featured-ribbon" aria-label="Featured Gold">⭐ Featured</span> : null}
      {card.featuredTier === "silver" || card.featuredTier === "bronze" ? <span className="featured-badge" aria-label={`Featured ${card.featuredTier}`}>⭐</span> : null}
      <div className="card-copy">
        <p className="card-category">{card.category}{card.subcategory ? <> · {card.subcategory}</> : null}</p>
        {card.verified ? <span className="verified-badge" aria-label="Verified business">✓ Verified</span> : null}
        <h2>{card.name}</h2>
        <p className="card-line">{card.line}</p>
        {card.ownerName ? <span className="card-owner-inline">by {card.ownerName}</span> : null}
      </div>
      {cardImage ? (
        card.imageMode === "business-card" ? (
          <div className="wall-card-biz-wrap"><Image src={cardImage} alt="" fill sizes="280px" className="wall-card-biz-photo" priority={false} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} /></div>
        ) : (
          <div className="wall-card-clip">
            {/* ponytail: plain img — position is user-defined (%, %) */}
            <img src={cardImage} alt="" draggable={false} className="wall-card-img-free" style={{ left: `${card.imageX ?? 50}%`, top: `${card.imageY ?? 35}%`, width: `${card.imageWidth ?? 90}%` }} />
          </div>
        )
      ) : null}
      {card.imageMode === "business-card" ? <span className="verified-badge card-biz-verified" aria-label="Verified business">✓ Verified</span> : null}
      <footer>
        <span>{card.area}</span>
        {card.price ? <strong className="card-price-right">{card.price}</strong> : null}
      </footer>
    </article>
  );
}
