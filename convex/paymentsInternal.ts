import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

const packageDurations: Record<number, number> = {
  2.99: 30 * 24 * 60 * 60 * 1000,
  7.99: 90 * 24 * 60 * 60 * 1000,
  24.99: 365 * 24 * 60 * 60 * 1000,
};

export const completePaidCard = internalMutation({
  args: {
    pendingCardId: v.id("pendingCards"),
    sessionId: v.string(),
    paidAmount: v.number(),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existingReceipt = await ctx.db.query("paymentReceipts").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existingReceipt) {
      const existingCard = await ctx.db.get(existingReceipt.cardId);
      if (!existingCard) throw new Error("The completed card could not be found.");
      const [existingUrls, existingThumbnailUrls] = await Promise.all([
        Promise.all(existingCard.imageIds.map((imageId) => ctx.storage.getUrl(imageId))),
        Promise.all((existingCard.thumbnailImageIds ?? []).map((imageId) => ctx.storage.getUrl(imageId))),
      ]);
      return { id: existingCard._id, ...existingCard, images: existingUrls.filter((url): url is string => url !== null), thumbnailImages: existingThumbnailUrls.filter((url): url is string => url !== null) };
    }
    const pending = await ctx.db.get(args.pendingCardId);
    if (!pending || pending.status !== "pending" || pending.expiresAt <= Date.now()) throw new Error("This pending card is no longer available.");
    const owner = await ctx.db.get(pending.ownerId);
    if (!owner || owner.tokenIdentifier !== args.tokenIdentifier) throw new Error("You can only complete your own card.");
    if (owner.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    if (pending.paidAmount !== args.paidAmount) throw new Error("The verified payment does not match this card.");
    const payload = pending.payload;
    const basePaidAmount = typeof payload.basePaidAmount === "number" ? payload.basePaidAmount : args.paidAmount;
    if (!packageDurations[basePaidAmount]) throw new Error("The payment amount is invalid.");
    const featuredTier = payload.featuredTier as "bronze" | "silver" | "gold" | undefined;
    const createdAt = Date.now();
    const cardId = await ctx.db.insert("cards", {
      ownerId: pending.ownerId,
      name: payload.name,
      category: payload.category,
      subcategory: payload.subcategory,
      line: payload.line,
      message: payload.message,
      area: payload.area,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      zipcode: payload.zipcode,
      neighborhood: payload.neighborhood,
      ownerName: owner.businessName || owner.username || undefined,
      price: payload.price,
      phone: payload.phone,
      email: payload.email,
      website: payload.website,
      location: payload.location,
      instagram: payload.instagram,
      facebook: payload.facebook,
      tiktok: payload.tiktok,
      linkedin: payload.linkedin,
      theme: payload.theme,
      imageMode: payload.imageMode,
      imageIds: payload.imageIds,
      thumbnailImageIds: payload.thumbnailImageIds,
      x: payload.x,
      y: payload.y,
      rotation: payload.rotation,
      width: payload.width,
      zIndex: createdAt,
      status: "published",
      paidAmount: basePaidAmount,
      featuredTier,
      reviewCount: 0,
      expiresAt: createdAt + packageDurations[basePaidAmount],
      positionLockedAt: createdAt,
      updatedAt: createdAt,
      createdAt,
      clicks: 0,
    });
    await ctx.db.insert("cardStats", { cardId, clicks: 0, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, updatedAt: createdAt });
    await ctx.db.insert("paymentReceipts", { sessionId: args.sessionId, pendingCardId: pending._id, cardId, paidAmount: args.paidAmount, usedAt: createdAt });
    await ctx.db.patch(pending._id, { status: "completed" });
    const imageIds = payload.imageIds as Id<"_storage">[];
    const thumbnailImageIds = (payload.thumbnailImageIds ?? []) as Id<"_storage">[];
    const [urls, thumbnailUrls] = await Promise.all([
      Promise.all(imageIds.map((imageId) => ctx.storage.getUrl(imageId))),
      Promise.all(thumbnailImageIds.map((imageId) => ctx.storage.getUrl(imageId))),
    ]);
    return { id: cardId, ...payload, ownerId: pending.ownerId, images: urls.filter((url): url is string => url !== null), thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null), zIndex: createdAt, status: "published" as const, paidAmount: basePaidAmount, featuredTier, reviewCount: 0, expiresAt: createdAt + packageDurations[basePaidAmount], positionLockedAt: createdAt, updatedAt: createdAt, createdAt, clicks: 0 };
  },
});

export const completePaidRenewal = internalMutation({
  args: {
    cardId: v.id("cards"),
    sessionId: v.string(),
    paidAmount: v.number(),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existingReceipt = await ctx.db.query("renewalReceipts").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existingReceipt) {
      if (existingReceipt.cardId !== args.cardId) throw new Error("This payment has already been used.");
      const existingCard = await ctx.db.get(args.cardId);
      if (!existingCard) throw new Error("The renewed card could not be found.");
      return { success: true, status: existingCard.status, expiresAt: existingCard.expiresAt };
    }

    const owner = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique();
    const card = await ctx.db.get(args.cardId);
    if (!owner || !card || card.ownerId !== owner._id) throw new Error("You can only renew your own cards.");
    if (owner.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    const duration = packageDurations[args.paidAmount];
    if (!duration) throw new Error("The verified payment amount is invalid.");

    const now = Date.now();
    const status = card.status === "hidden" ? "hidden" as const : "published" as const;
    const expiresAt = Math.max(now, card.expiresAt) + duration;
    await ctx.db.patch(card._id, { status, paidAmount: args.paidAmount, expiresAt, updatedAt: now });
    await ctx.db.insert("renewalReceipts", { sessionId: args.sessionId, cardId: card._id, paidAmount: args.paidAmount, usedAt: now });
    return { success: true, status, expiresAt };
  },
});
