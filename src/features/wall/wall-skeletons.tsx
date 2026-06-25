"use client";

type CardStyle = React.CSSProperties & Record<"--x" | "--y" | "--r" | "--w" | "--h" | "--tape-l" | "--tape-w" | "--tape-r", string>;

// Fixed positions that give a realistic spread across the wall
const WALL_SKELS: { x: number; y: number; r: number; w: number; h: number; tl: number; tw: number; tr: number }[] = [
  { x: 6,  y: 54,  r: -2, w: 200, h: 215, tl: 42, tw: 64, tr: -8 },
  { x: 26, y: 112, r: 3,  w: 220, h: 185, tl: 55, tw: 78, tr: 4  },
  { x: 45, y: 50,  r: -1, w: 200, h: 205, tl: 38, tw: 70, tr: -5 },
  { x: 63, y: 132, r: 4,  w: 215, h: 220, tl: 60, tw: 56, tr: 6  },
  { x: 14, y: 382, r: -3, w: 205, h: 185, tl: 45, tw: 82, tr: -3 },
  { x: 36, y: 322, r: 2,  w: 220, h: 200, tl: 50, tw: 66, tr: 2  },
  { x: 57, y: 358, r: -2, w: 200, h: 215, tl: 35, tw: 72, tr: -7 },
  { x: 75, y: 88,  r: 1,  w: 210, h: 180, tl: 48, tw: 60, tr: 3  },
];

export function WallSkeletons({ listView }: { listView: boolean }) {
  if (listView) {
    return (
      <div className="list-card-list">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="wall-card-skeleton wall-card-skeleton-list" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skel-line skel-xs" />
            <div className="skel-line skel-title" />
            <div className="skel-line skel-sm" />
            <div className="skel-line skel-md" />
            <div className="skel-img" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {WALL_SKELS.map((s, i) => {
        const style: CardStyle = {
          "--x": `${s.x}%`,
          "--y": `${s.y}px`,
          "--r": `${s.r}deg`,
          "--w": `${s.w}px`,
          "--h": `${s.h}px`,
          "--tape-l": `${s.tl}%`,
          "--tape-w": `${s.tw}px`,
          "--tape-r": `${s.tr}deg`,
          animationDelay: `${i * 55}ms`,
        } as CardStyle & React.CSSProperties;
        return (
          <div key={i} className="wall-card-skeleton" style={style} aria-hidden="true">
            <span className="card-tape" />
            <div className="skel-body">
              <div className="skel-line skel-xs" />
              <div className="skel-line skel-title" />
              <div className="skel-line skel-sm" />
              <div className="skel-line skel-md" />
            </div>
          </div>
        );
      })}
    </>
  );
}
