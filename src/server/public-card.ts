import "server-only";

import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const getPublicCard = cache(async (rawCardId: string) => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const client = new ConvexHttpClient(convexUrl);
    return await client.query(api.cards.getPublishedById, { cardId: rawCardId as Id<"cards"> });
  } catch {
    return null;
  }
});

export const getEmbedCard = cache(async (rawCardId: string) => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const client = new ConvexHttpClient(convexUrl);
    return await client.query(api.cards.getCardForEmbed, { cardId: rawCardId as Id<"cards"> });
  } catch {
    return null;
  }
});
