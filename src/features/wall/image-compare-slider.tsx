"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { BusinessCardShape } from "./types";

type ImageSwapViewerProps = {
  frontSrc?: string;
  backSrc?: string;
  frontAlt: string;
  backAlt: string;
  className?: string;
  layout?: "full" | "horizontal" | "photo" | BusinessCardShape;
};

export function ImageSwapViewer({
  frontSrc,
  backSrc,
  frontAlt,
  backAlt,
  className,
  layout = "full",
}: ImageSwapViewerProps) {
  const hasFront = Boolean(frontSrc);
  const hasBack = Boolean(backSrc);
  const [side, setSide] = useState<"front" | "back" | null>(() => (frontSrc ? "front" : backSrc ? "back" : null));
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const dragRef = useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);

  const handlePanPointerDown = (event: PointerEvent<HTMLImageElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanPointerMove = (event: PointerEvent<HTMLImageElement>) => {
    const start = dragRef.current;
    if (!start || start.id !== event.pointerId) return;
    const nextX = Math.max(0, Math.min(100, Number((start.originX + ((event.clientX - start.x) / 4)).toFixed(1))));
    const nextY = Math.max(0, Math.min(100, Number((start.originY + ((event.clientY - start.y) / 4)).toFixed(1))));
    setPan({ x: nextX, y: nextY });
  };

  const handlePanPointerEnd = (event: PointerEvent<HTMLImageElement>) => {
    const start = dragRef.current;
    if (!start || start.id !== event.pointerId) return;
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released by browser */
    }
  };

  if (!hasFront && !hasBack) return null;
  const showFront = side ? side === "front" : hasFront;
  const visibleSrc = showFront ? frontSrc : backSrc;
  const visibleAlt = showFront ? frontAlt : backAlt;

  return (
    <div className={`image-swap ${className ?? ""}`.trim()}>
      <div className={`image-swap-stage backside-art layout-${layout}`}>
        <img
          src={visibleSrc}
          alt={visibleAlt}
          draggable={false}
          className="image-swap-image"
          style={{ objectPosition: `${pan.x}% ${pan.y}%` }}
          onPointerDown={handlePanPointerDown}
          onPointerMove={handlePanPointerMove}
          onPointerUp={handlePanPointerEnd}
          onPointerCancel={handlePanPointerEnd}
        />
        {hasFront && hasBack ? (
          <button
            type="button"
            className="image-swap-toggle"
            onClick={() => setSide((current) => (current === "front" ? "back" : "front"))}
            aria-label={showFront ? "Show back image" : "Show front image"}
          >
            <span aria-hidden="true" />
            {showFront ? "Back" : "Front"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
