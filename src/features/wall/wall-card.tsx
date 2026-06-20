"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { getCardFormat, type WallCard as WallCardModel } from "./types";

interface WallCardProps {
  card: WallCardModel;
  active: boolean;
  onOpen: (card: WallCardModel) => void;
  onFront: (id: string) => void;
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

export function WallCard({ card, active, onOpen, onFront, zIndex }: WallCardProps) {
  const seed = hashString(String(card.id));
  const tapeWidth = 42 + (seed % 45); // 42px to 86px
  const tapeRotate = -14 + ((seed >> 3) % 23); // -14deg to +8deg
  const tapeLeft = 22 + ((seed >> 6) % 48); // 22% to 69%
  const format = getCardFormat(card.theme);

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

  return (
    <article
      className={`wall-card theme-${card.theme} ${active ? "is-active" : ""}`}
      style={style}
      onPointerDown={() => onFront(card.id)}
      onClick={() => onOpen(card)}
      tabIndex={0}
      role="button"
      onKeyDown={handleKeyDown}
      aria-label={`Open advertisement for ${card.name}`}
    >
      <span className="card-tape" aria-hidden="true" />
      <div className="card-copy">
        <p className="card-category">{card.category}</p>
        <h2>{card.name}</h2>
        <p className="card-line">{card.line}</p>
      </div>
      {card.images[0] ? <img src={card.images[0]} alt="" draggable="false" /> : null}
      <footer>
        <span>{card.area}</span>
        {card.price ? <strong>{card.price}</strong> : null}
      </footer>
    </article>
  );
}
