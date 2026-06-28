import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

type GdprExport = {
  exportedAt: string;
  profile: { displayName: string | null; username: string | null; businessName: string | null; email: string | null; createdAt: string };
  cards: Array<{ name: string; category: string; line: string; area: string; city: string; state: string; country: string; status: string; paidAmount: number; createdAt: string; expiresAt: string }>;
  reviews: Array<{ rating: number; text: string | null; createdAt: string }>;
  savedCardCount: number;
  savedWallCount: number;
  likedCardCount: number;
};

export const _gatherMyData = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }): Promise<GdprExport> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const [cards, reviews, savedCards, savedWalls, cardLikes] = await Promise.all([
      ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect(),
      ctx.db.query("reviews").withIndex("by_user_and_card", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("savedCards").withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("savedWalls").withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("cardLikes").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: user.displayName ?? null,
        username: user.username ?? null,
        businessName: user.businessName ?? null,
        email: user.email ?? null,
        createdAt: new Date(user.createdAt).toISOString(),
      },
      cards: cards.map((c) => ({
        name: c.name,
        category: c.category,
        line: c.line,
        area: c.area,
        city: c.city,
        state: c.state,
        country: c.country,
        status: c.status,
        paidAmount: c.paidAmount,
        createdAt: new Date(c.createdAt).toISOString(),
        expiresAt: new Date(c.expiresAt).toISOString(),
      })),
      reviews: reviews.map((r) => ({
        rating: r.rating,
        text: r.text ?? null,
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      savedCardCount: savedCards.length,
      savedWallCount: savedWalls.length,
      likedCardCount: cardLikes.length,
    };
  },
});

export const _deleteMyData = internalMutation({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();

    // Delete uploaded images from storage
    const allStorageIds = cards.flatMap((c) => [
      ...(c.imageIds ?? []),
      ...(c.thumbnailImageIds ?? []),
      ...(c.backImageIds ?? []),
      ...(c.backThumbnailImageIds ?? []),
    ]);
    await Promise.all(allStorageIds.map((id) => ctx.storage.delete(id).catch(() => {})));

    await Promise.all(cards.map((c) => ctx.db.delete(c._id)));

    const [reviews, savedCards, savedWalls, cardLikes, verificationRequests] = await Promise.all([
      ctx.db.query("reviews").withIndex("by_user_and_card", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("savedCards").withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("savedWalls").withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("cardLikes").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("verificationRequests").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    await Promise.all([
      ...reviews.map((r) => ctx.db.delete(r._id)),
      ...savedCards.map((c) => ctx.db.delete(c._id)),
      ...savedWalls.map((w) => ctx.db.delete(w._id)),
      ...cardLikes.map((l) => ctx.db.delete(l._id)),
      ...verificationRequests.map((vr) => ctx.db.delete(vr._id)),
    ]);

    const clerkUserId = user.externalUserId;
    await ctx.db.delete(user._id);

    return { clerkUserId };
  },
});

export const exportMyData = action({
  args: {},
  handler: async (ctx): Promise<GdprExport> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.runQuery(internal.gdpr._gatherMyData, {
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const deleteAccount = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { clerkUserId } = await ctx.runMutation(internal.gdpr._deleteMyData, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey && clerkUserId) {
      const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      });
      if (!res.ok) {
        console.error("Clerk user deletion failed:", await res.text());
      }
    }

    return { success: true };
  },
});
