"use client";

import { useEffect, useState } from "react";

type ImageSwapViewerProps = {
  frontSrc?: string;
  backSrc?: string;
  frontAlt: string;
  backAlt: string;
  className?: string;
};

export function ImageSwapViewer({
  frontSrc,
  backSrc,
  frontAlt,
  backAlt,
  className,
}: ImageSwapViewerProps) {
  const hasFront = Boolean(frontSrc);
  const hasBack = Boolean(backSrc);
  const [side, setSide] = useState<"front" | "back" | null>(() => (frontSrc ? "front" : backSrc ? "back" : null));

  useEffect(() => {
    setSide(frontSrc ? "front" : backSrc ? "back" : null);
  }, [frontSrc, backSrc]);

  if (!hasFront && !hasBack) return null;
  const showFront = side ? side === "front" : hasFront;
  const visibleSrc = showFront ? frontSrc : backSrc;
  const visibleAlt = showFront ? frontAlt : backAlt;

  return (
    <div className={`image-swap ${className ?? ""}`.trim()}>
      <div className="image-swap-stage">
        <img src={visibleSrc} alt={visibleAlt} draggable={false} className="image-swap-image" />
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
