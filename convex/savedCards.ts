import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ensureCurrentUserDoc } from "./users";

async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
}

async function ensureActiveUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to save cards.");
  let user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user) {
    const userId = await ensureCurrentUserDoc(ctx);
    user = userId ? await ctx.db.get(userId) : null;
  }
  if (!user) throw new Error("Your WALL profile could not be created.");
  if (user.blockedAt) throw new Error("Your account is blocked by WALL admin.");
  return user;
}

async function toSavedCard(ctx: QueryCtx, card: Doc<"cards">) {
  const [urls, thumbnailUrls, backUrls, backThumbnailUrls, stats] = await Promise.all([
    Promise.all(card.imageIds.map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
    Promise.all((card.thumbnailImageIds ?? []).map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
    Promise.all((card.backImageIds ?? []).map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
    Promise.all((card.backThumbnailImageIds ?? []).map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
    ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", card._id)).unique(),
  ]);
  return {
    id: card._id,
    ownerId: card.ownerId,
    name: card.name,
    category: card.category,
    line: card.line,
    message: card.message,
    area: card.area,
    city: card.city,
    state: card.state,
    country: card.country,
    zipcode: card.zipcode,
    price: card.price,
    phone: card.phone,
    email: card.email,
    website: card.website,
    location: card.location,
    instagram: card.instagram,
    facebook: card.facebook,
    tiktok: card.tiktok,
    linkedin: card.linkedin,
    theme: card.theme,
    imageMode: card.imageMode,
    images: urls.filter((url): url is string => url !== null),
    thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null),
    backImages: backUrls.filter((url): url is string => url !== null),
    backThumbnailImages: backThumbnailUrls.filter((url): url is string => url !== null),
    x: card.x,
    y: card.y,
    rotation: card.rotation,
    width: card.width,
    zIndex: card.zIndex,
    positionLockedAt: card.positionLockedAt,
    updatedAt: card.updatedAt,
    createdAt: card.createdAt,
    paidAmount: card.paidAmount,
    expiresAt: card.expiresAt,
    clicks: stats?.clicks ?? card.clicks,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];
    const saved = await ctx.db.query("savedCards").withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id)).order("desc").take(100);
    const now = Date.now();
    const cards = await Promise.all(saved.map((item) => ctx.db.get(item.cardId)));
    const visibleCards = cards.filter((card): card is Doc<"cards"> => Boolean(card && card.status === "published" && card.expiresAt > now));
    return await Promise.all(visibleCards.map((card) => toSavedCard(ctx, card)));
  },
});

export const setSaved = mutation({
  args: { cardId: v.id("cards"), saved: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ensureActiveUser(ctx);
    const existing = await ctx.db.query("savedCards").withIndex("by_userId_and_cardId", (q) => q.eq("userId", user._id).eq("cardId", args.cardId)).unique();
    if (!args.saved) {
      if (existing) await ctx.db.delete(existing._id);
      return { saved: false };
    }
    const card = await ctx.db.get(args.cardId);
    if (!card || card.status !== "published" || card.expiresAt <= Date.now()) throw new Error("That card is no longer available.");
    if (!existing) {
      await ctx.db.insert("savedCards", { userId: user._id, cardId: card._id, createdAt: Date.now() });
      const stats = await ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", card._id)).unique();
      if (stats) await ctx.db.patch(stats._id, { saves: stats.saves + 1, updatedAt: Date.now() });
    }
    return { saved: true };
  },
});

export const mergeLocal = mutation({
  args: { cardIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.cardIds.length > 100) throw new Error("Too many saved cards to import.");
    const user = await ensureActiveUser(ctx);
    let imported = 0;
    for (const rawCardId of new Set(args.cardIds)) {
      const cardId = ctx.db.normalizeId("cards", rawCardId);
      if (!cardId) continue;
      const card = await ctx.db.get(cardId);
      if (!card || card.status !== "published" || card.expiresAt <= Date.now()) continue;
      const existing = await ctx.db.query("savedCards").withIndex("by_userId_and_cardId", (q) => q.eq("userId", user._id).eq("cardId", cardId)).unique();
      if (!existing) {
        await ctx.db.insert("savedCards", { userId: user._id, cardId, createdAt: Date.now() });
        imported += 1;
      }
    }
    return { imported };
  },
});
