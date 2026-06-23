import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_card_and_createdAt", (q) => q.eq("cardId", args.cardId))
      .order("desc")
      .take(100);

    const identity = await ctx.auth.getUserIdentity();
    const currentUser = identity
      ? await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique()
      : null;

    const card = await ctx.db.get(args.cardId);
    const isCardOwner = currentUser ? currentUser._id === card?.ownerId : false;

    return {
      reviews: reviews.map((review) => ({
        id: review._id,
        rating: review.rating,
        text: review.text,
        reviewerName: review.reviewerName,
        createdAt: review.createdAt,
        isOwn: currentUser ? review.userId === currentUser._id : false,
      })),
      isCardOwner,
    };
  },
});

export const getMyReview = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_user_and_card", (q) => q.eq("userId", user._id).eq("cardId", args.cardId))
      .unique();
    if (!review) return null;
    return { id: review._id, rating: review.rating, text: review.text };
  },
});

export const upsert = mutation({
  args: {
    cardId: v.id("cards"),
    rating: v.number(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must sign in to leave a review.");
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new Error("Your profile could not be found.");
    if (user.blockedAt) throw new Error("Your account is blocked.");
    if (args.rating < 1 || args.rating > 5 || !Number.isInteger(args.rating)) throw new Error("Rating must be between 1 and 5 stars.");
    if (args.text && args.text.length > 500) throw new Error("Review text must be 500 characters or fewer.");
    const card = await ctx.db.get(args.cardId);
    if (!card || card.status !== "published") throw new Error("This card is not available for review.");
    if (card.ownerId === user._id) throw new Error("You cannot review your own card.");

    const reviewerName = user.businessName || user.username || user.displayName || undefined;
    const now = Date.now();
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_and_card", (q) => q.eq("userId", user._id).eq("cardId", args.cardId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { rating: args.rating, text: args.text?.trim() || undefined, reviewerName, updatedAt: now });
    } else {
      await ctx.db.insert("reviews", {
        cardId: args.cardId,
        userId: user._id,
        rating: args.rating,
        text: args.text?.trim() || undefined,
        reviewerName,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(card._id, { reviewCount: (card.reviewCount ?? 0) + 1 });
    }
  },
});

export const remove = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return;
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_and_card", (q) => q.eq("userId", user._id).eq("cardId", args.cardId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      const card = await ctx.db.get(args.cardId);
      if (card) await ctx.db.patch(card._id, { reviewCount: Math.max(0, (card.reviewCount ?? 0) - 1) });
    }
  },
});
