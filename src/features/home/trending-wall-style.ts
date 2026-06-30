import type { CSSProperties } from "react";

type WallCardVars = CSSProperties & Record<"--twc-bg" | "--twc-border" | "--twc-tape" | "--twc-hover", string>;

function hashStr(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function wallCardStyle(value: string): WallCardVars {
  const seed = hashStr(value);
  const hue = seed % 360;
  const sat = 32 + (seed >> 8) % 18;
  const light = 85 + (seed >> 16) % 8;
  return {
    "--twc-bg": `hsl(${hue} ${sat}% ${light}%)`,
    "--twc-border": `hsl(${hue} ${Math.max(20, sat - 10)}% ${Math.max(56, light - 14)}%)`,
    "--twc-tape": `hsl(${(hue + 16) % 360} ${sat}% ${Math.min(96, light + 2)}% / .72)`,
    "--twc-hover": `hsl(${hue} ${sat}% ${Math.min(97, light + 4)}%)`,
  };
}
