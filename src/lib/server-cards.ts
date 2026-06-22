import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { WallCard } from "@/features/wall/types";

export async function fetchInitialCards(args: {
  country?: string;
  state?: string;
  city?: string;
}): Promise<WallCard[]> {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return [];
    const client = new ConvexHttpClient(url);
    const cards = await client.query(api.cards.listPublished, args);
    return (cards ?? []) as WallCard[];
  } catch {
    return [];
  }
}
