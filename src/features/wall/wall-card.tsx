"use client";

import { FlipHorizontal2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent } from "react";
import Image from "next/image";
import { getCardFormat, type WallCard as WallCardModel } from "./types";
import { BLUR_PLACEHOLDER } from "@/lib/blur-placeholder";

interface WallCardProps {
  card: WallCardModel;
  active: boolean;
  onOpen: (card: WallCardModel) => void;
  onFront: (id: string) => void;
  flipped?: boolean;
  onFlip?: (card: WallCardModel) => void;
  ownerDraggable?: boolean;
  onRotate?: (card: WallCardModel, rotation: number) => void;
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

export function WallCard({ card, active, onOpen, onFront, flipped = false, onFlip, ownerDraggable = false, onRotate, expiringSoon = false, dragging = false, onDragStart, onDragMove, onDragEnd, zIndex }: WallCardProps) {
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const tiltPointerRef = useRef<{ id: number; x: number; y: number; rotation: number } | null>(null);
  const didDragRef = useRef(false);
  const [rotationDraft, setRotationDraft] = useState(card.rotation);
  const seed = hashString(String(card.id));
  const tapeWidth = 42 + (seed % 45); // 42px to 86px
  const tapeRotate = -14 + ((seed >> 3) % 23); // -14deg to +8deg
  const tapeLeft = 22 + ((seed >> 6) % 48); // 22% to 69%
  const displayTheme = card.imageMode === "business-card" ? "biz" : card.theme;
  const cardImage = card.thumbnailImages?.[0] ?? card.images[0];
  const backImage = card.backImages?.[0] ?? card.backThumbnailImages?.[0];
  const format = card.imageMode === "business-card" ? getCardFormat("biz", card.cardShape) : getCardFormat(displayTheme);
  const imageTopLayout = Boolean(cardImage && card.imageMode !== "business-card" && displayTheme !== "biz" && displayTheme !== "ticket");
  const backLayout = card.imageMode === "business-card" ? (card.cardShape ?? "horizontal") : (displayTheme === "photo" ? "photo" : (displayTheme === "biz" || displayTheme === "ticket" ? "horizontal" : "full"));
  const frontObjectPosition = `${card.imageX ?? 50}% ${card.imageY ?? 35}%`;

  useEffect(() => {
    setRotationDraft(card.rotation);
  }, [card.rotation]);

  const handleTiltPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!onRotate || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onFront(card.id);
    tiltPointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: rotationDraft };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTiltPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = tiltPointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    const delta = (event.clientX - start.x) * 0.45 - (event.clientY - start.y) * 0.18;
    const next = Math.max(-90, Math.min(90, Math.round(start.rotation + delta)));
    if (next !== rotationDraft) setRotationDraft(next);
  };

  const handleTiltPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const start = tiltPointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    tiltPointerRef.current = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
    if (onRotate && rotationDraft !== card.rotation) onRotate(card, rotationDraft);
  };

  const style: CardStyle = {
    "--x": `${card.x}%`,
    "--y": `${card.y}px`,
    "--r": `${rotationDraft}deg`,
    "--w": `${format.width}px`,
    "--h": `${format.minHeight}px`,
    "--tape-w": `${tapeWidth}px`,
    "--tape-r": `${tapeRotate}deg`,
    "--tape-l": `${tapeLeft}%`,
    zIndex,
  };
  const frontFace = (
    <div className="wall-card-face wall-card-face-front">
      {imageTopLayout ? (
        <>
          <div className="wall-card-image-top-wrap">
            <img src={cardImage} alt="" draggable={false} className="wall-card-image-top" style={{ objectPosition: frontObjectPosition, "--image-h": `${card.imageHeight ?? 156}px` } as CSSProperties} />
          </div>
          <div className="wall-card-content">
            <div className="card-copy">
              <p className="card-category">{card.category}{card.subcategory ? <> · {card.subcategory}</> : null}</p>
              {card.verified ? <span className="verified-badge" aria-label="Verified business">✓ Verified</span> : null}
              <h2>{card.name}</h2>
              <p className="card-line">{card.line}</p>
              {card.ownerName ? <span className="card-owner-inline">by {card.ownerName}</span> : null}
            </div>
          </div>
        </>
      ) : (
        <div className="card-copy">
          <p className="card-category">{card.category}{card.subcategory ? <> · {card.subcategory}</> : null}</p>
          {card.verified ? <span className="verified-badge" aria-label="Verified business">✓ Verified</span> : null}
          <h2>{card.name}</h2>
          <p className="card-line">{card.line}</p>
          {card.ownerName ? <span className="card-owner-inline">by {card.ownerName}</span> : null}
        </div>
      )}
      {!imageTopLayout && cardImage ? (
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
    </div>
  );
  const backFace = (
    <div className="wall-card-face wall-card-face-back">
      {card.imageMode === "business-card" && backImage ? (
        <div className="wall-card-biz-wrap">
          <img src={backImage} alt="" draggable={false} className="wall-card-biz-photo wall-card-back-photo" />
        </div>
      ) : backImage ? (
        <div className="wall-card-back-wrap">
          <div className={`wall-card-back-art backside-art layout-${backLayout}`}>
            <img
              src={backImage}
              alt=""
              draggable={false}
              className="wall-card-back-image"
            />
          </div>
        </div>
      ) : (
        <div className={`wall-card-back-empty theme-${displayTheme}`}>
          <span>No back image yet.</span>
        </div>
      )}
    </div>
  );
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

  const handleFlipClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onFront(card.id);
    onFlip?.(card);
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
      className={`wall-card theme-${displayTheme} ${imageTopLayout ? "image-top-layout" : ""} ${card.imageMode === "business-card" && cardImage ? "image-business-card" : ""} ${active ? "is-active" : ""} ${ownerDraggable ? "is-owner-card" : ""} ${dragging ? "is-owner-dragging" : ""} ${card.featuredTier ? `featured-${card.featuredTier}` : ""} ${expiringSoon ? "is-expiring-soon" : ""}`}
      data-card-id={card.id}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={(event) => {
        if ((event.target as HTMLElement | null)?.closest("button")) return;
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
      {card.featuredTier === "boost" ? <span className="featured-ribbon featured-ribbon-boost" aria-label="Boosted listing">⚡ Boost</span> : null}
      {card.featuredTier === "gold" ? <span className="featured-ribbon" aria-label="Featured Gold">⭐ Featured</span> : null}
      {card.featuredTier === "silver" || card.featuredTier === "bronze" ? <span className="featured-badge" aria-label={`Featured ${card.featuredTier}`}>⭐</span> : null}
      {onFlip ? (
        <button
          type="button"
          className={`card-flip-button ${flipped ? "is-back" : "is-front"}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleFlipClick}
          aria-pressed={flipped}
          aria-label={flipped ? `Show front of ${card.name}` : `Show back of ${card.name}`}
          title={flipped ? "Show front" : "Show back"}
        >
          <FlipHorizontal2 size={12} aria-hidden="true" />
        </button>
      ) : null}
      {ownerDraggable && onRotate ? (
        <button
          type="button"
          className="wall-card-tilt-handle"
          onPointerDown={handleTiltPointerDown}
          onPointerMove={handleTiltPointerMove}
          onPointerUp={handleTiltPointerEnd}
          onPointerCancel={handleTiltPointerEnd}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Tilt ${card.name}`}
          title="Hold and drag to tilt"
        >
          <RotateCcw size={12} />
        </button>
      ) : null}
      <div className={`wall-card-face-stack ${flipped ? "is-flipped" : ""}`}>
        {frontFace}
        {backFace}
      </div>
      </article>
  );
}
