import type { TopCard } from "@/lib/server-cards";
import type { CSSProperties } from "react";

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

type CardVars = CSSProperties & Record<string, string | number>;

function MiniCard({ card, rank, metric, onSelect }: { card: TopCard; rank: number; metric: string; onSelect: (id: string) => void }) {
  const seed = hashStr(card.id);
  const tapeWidth = 42 + (seed % 45);
  const tapeRotate = -14 + ((seed >> 3) % 23);
  const tapeLeft = 22 + ((seed >> 6) % 48);
  const rot = card.rotation ?? 0;

  const style: CardVars = {
    "--r": `${rot}deg`,
    "--tape-w": `${tapeWidth}px`,
    "--tape-r": `${tapeRotate}deg`,
    "--tape-l": `${tapeLeft}%`,
  };

  return (
    <button
      type="button"
      className={`tc-card wall-card theme-${card.theme}`}
      style={style}
      onClick={() => onSelect(card.id)}
      aria-label={`Open ${card.name}`}
    >
      <span className="card-tape" aria-hidden="true" />
      <span className="tc-rank">{rank}</span>
      <div className="card-copy">
        <p className="card-category">{card.category}</p>
        <h2>{card.name}</h2>
        <p className="card-line">{card.line}</p>
      </div>
      <footer>
        <span>{card.area}</span>
        <span className="tc-metric">{card.metric.toLocaleString()} {metric}</span>
      </footer>
    </button>
  );
}

interface Props {
  cards: TopCard[];
  metric: string;
  empty: string;
  onSelect: (id: string) => void;
}

export function TrendingCardGrid({ cards, metric, empty, onSelect }: Props) {
  if (cards.length === 0) return <p className="trending-empty">{empty}</p>;
  return (
    <div className="tc-wall">
      {cards.map((card, i) => (
        <MiniCard key={card.id} card={card} rank={i + 1} metric={metric} onSelect={onSelect} />
      ))}
    </div>
  );
}
