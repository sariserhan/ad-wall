export const categories = ["All", "Services", "Food", "Home", "Classes", "Pets", "Repairs", "Shops"] as const;
export const cardThemes = ["yellow", "paper", "pink", "cyan", "dark", "cream", "biz", "kraft", "blueprint", "photo", "ticket"] as const;

export type CardCategory = Exclude<(typeof categories)[number], "All">;
export type CardTheme = (typeof cardThemes)[number];

export const cardFormats: Record<CardTheme, { width: number; minHeight: number }> = {
  yellow: { width: 205, minHeight: 205 },
  paper: { width: 220, minHeight: 245 },
  pink: { width: 220, minHeight: 245 },
  cyan: { width: 220, minHeight: 245 },
  dark: { width: 220, minHeight: 245 },
  cream: { width: 220, minHeight: 245 },
  biz: { width: 300, minHeight: 180 },
  kraft: { width: 215, minHeight: 255 },
  blueprint: { width: 235, minHeight: 235 },
  photo: { width: 205, minHeight: 285 },
  ticket: { width: 300, minHeight: 180 },
};

export function getCardFormat(theme: CardTheme) {
  return cardFormats[theme];
}

import type { Id } from "../../../convex/_generated/dataModel";

export interface WallCard {
  id: string | Id<"cards">;
  name: string;
  category: CardCategory;
  line: string;
  message?: string;
  area: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  price?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  theme: CardTheme;
  images: string[];
  x: number;
  y: number;
  rotation: number;
  width: number;
  zIndex: number;
  positionLockedAt?: number;
  createdAt: number;
  ownerId?: string;
  paidAmount?: number;
  expiresAt?: number;
  clicks?: number;
}

export interface OwnerCard extends WallCard {
  status: "published" | "hidden" | "expired";
  expiresAt: number;
  paidAmount: number;
  clicks: number;
}

export interface CardDraft {
  name: string;
  category: CardCategory;
  line: string;
  message?: string;
  area: string;
  city: string;
  state: string;
  country: string;
  zipcode?: string;
  price?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  theme: CardTheme;
  paymentOption: "free" | "1" | "3" | "10" | "20";
  files: File[];
  previews: string[];
}

export interface Placement {
  x: number;
  y: number;
}

export type CreateCard = (draft: CardDraft, placement: Placement) => Promise<WallCard | void>;
