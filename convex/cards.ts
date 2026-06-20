import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const category = v.union(v.literal("Services"), v.literal("Food"), v.literal("Home"), v.literal("Classes"), v.literal("Pets"), v.literal("Repairs"), v.literal("Shops"));
const theme = v.union(v.literal("yellow"), v.literal("paper"), v.literal("pink"), v.literal("cyan"), v.literal("dark"), v.literal("cream"), v.literal("biz"), v.literal("kraft"), v.literal("blueprint"), v.literal("photo"), v.literal("ticket"));

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string; subject: string; name?: string; email?: string; pictureUrl?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must sign in to post a card.");
  return identity;
}

const packageDurations: Record<number, number> = {
  0: 24 * 60 * 60 * 1000,
  1: 7 * 24 * 60 * 60 * 1000,
  3: 30 * 24 * 60 * 60 * 1000,
  10: 150 * 24 * 60 * 60 * 1000,
  20: 365 * 24 * 60 * 60 * 1000,
};

function getExpiryDuration(paidAmount: number): number {
  return packageDurations[paidAmount] ?? packageDurations[0];
}

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_status_created", (q) => q.eq("status", "published"))
      .order("asc")
      .take(200);

    const visibleCards = cards.filter((card) => card.expiresAt > now);

    return Promise.all(visibleCards.map(async (card) => {
      const urls = await Promise.all(card.imageIds.map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId)));
      return {
        id: card._id,
        ownerId: card.ownerId,
        name: card.name,
        category: card.category,
        line: card.line,
        message: card.message,
        area: card.area,
        price: card.price,
        theme: card.theme,
        images: urls.filter((url): url is string => url !== null),
        x: card.x,
        y: card.y,
        rotation: card.rotation,
        width: card.width,
        zIndex: card.zIndex,
        positionLockedAt: card.positionLockedAt,
        createdAt: card.createdAt,
        paidAmount: card.paidAmount,
        expiresAt: card.expiresAt,
        clicks: card.clicks,
      };
    }));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category,
    line: v.string(),
    message: v.optional(v.string()),
    area: v.string(),
    city: v.string(),
    state: v.string(),
    country: v.string(),
    zipcode: v.optional(v.string()),
    price: v.optional(v.string()),
    paidAmount: v.number(),
    theme,
    imageIds: v.array(v.id("_storage")),
    x: v.number(),
    y: v.number(),
    rotation: v.number(),
    width: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (args.imageIds.length > 2) throw new Error("A card can have at most two images.");
    if (!args.name.trim() || args.name.length > 60) throw new Error("Business name must be between 1 and 60 characters.");
    if (!args.line.trim() || args.line.length > 90) throw new Error("Service description must be between 1 and 90 characters.");
    if (args.message && args.message.length > 300) throw new Error("Message must be 300 characters or fewer.");
    if (!args.area.trim() || args.area.length > 50) throw new Error("Neighborhood must be between 1 and 50 characters.");
    if (!args.city.trim() || args.city.length > 100) throw new Error("City must be specified.");
    if (!args.state.trim() || args.state.length > 100) throw new Error("State must be specified.");
    if (!args.country.trim() || args.country.length > 100) throw new Error("Country must be specified.");
    if (args.zipcode && args.zipcode.length > 20) throw new Error("Zip code must be shorter than 20 characters.");
    if (args.x < 0 || args.x > 88 || args.y < 0 || args.y > 1500) throw new Error("That position is outside the wall.");
    if (![0, 1, 3, 10, 20].includes(args.paidAmount)) throw new Error("Invalid payment option.");

    let user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        authProvider: "clerk",
        externalUserId: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        displayName: identity.name,
        email: identity.email,
        avatarUrl: identity.pictureUrl,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }
    if (!user) throw new Error("Your profile could not be created.");

    const now = Date.now();
    const existingUserCards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    const activeCard = existingUserCards.find((card) => card.status === "published" && card.expiresAt > now);
    if (activeCard) {
      throw new Error("You already have an active card on the wall. One active card per user is allowed.");
    }

    const createdAt = now;
    const expiresAt = createdAt + getExpiryDuration(args.paidAmount);
    const existingCards = await ctx.db.query("cards").withIndex("by_status_created", (q) => q.eq("status", "published")).collect();
    const zIndex = existingCards.reduce((highest, card) => Math.max(highest, card.zIndex), 0) + 1;
    const cardId = await ctx.db.insert("cards", {
      ownerId: user._id,
      name: args.name.trim(),
      category: args.category,
      line: args.line.trim(),
      message: args.message?.trim() || undefined,
      area: args.area.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      country: args.country.trim(),
      zipcode: args.zipcode?.trim() || undefined,
      price: args.price?.trim() || undefined,
      theme: args.theme,
      imageIds: args.imageIds,
      x: args.x,
      y: args.y,
      rotation: args.rotation,
      width: args.width,
      zIndex,
      status: "published",
      paidAmount: args.paidAmount,
      expiresAt,
      positionLockedAt: createdAt,
      createdAt,
      clicks: 0,
    });
    const urls = await Promise.all(args.imageIds.map((imageId) => ctx.storage.getUrl(imageId)));
    return {
      id: cardId,
      ownerId: user._id,
      name: args.name.trim(),
      category: args.category,
      line: args.line.trim(),
      message: args.message?.trim() || undefined,
      area: args.area.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      country: args.country.trim(),
      zipcode: args.zipcode?.trim() || undefined,
      price: args.price?.trim() || undefined,
      theme: args.theme,
      images: urls.filter((url): url is string => url !== null),
      x: args.x,
      y: args.y,
      rotation: args.rotation,
      width: args.width,
      zIndex,
      positionLockedAt: createdAt,
      createdAt,
      paidAmount: args.paidAmount,
      expiresAt,
      clicks: 0,
    };
  },
});

export const incrementClicks = mutation({
  args: {
    cardId: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");
    await ctx.db.patch(args.cardId, {
      clicks: (card.clicks ?? 0) + 1,
    });
    return { success: true };
  },
});
