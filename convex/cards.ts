import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const category = v.union(v.literal("Services"), v.literal("Food"), v.literal("Home"), v.literal("Classes"), v.literal("Pets"), v.literal("Repairs"), v.literal("Shops"));
const theme = v.union(v.literal("yellow"), v.literal("paper"), v.literal("pink"), v.literal("cyan"), v.literal("dark"), v.literal("cream"), v.literal("biz"), v.literal("kraft"), v.literal("blueprint"), v.literal("photo"), v.literal("ticket"));

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string; subject: string; name?: string; email?: string; pictureUrl?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must sign in to post a card.");
  return identity;
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user) throw new Error("Your WALL profile could not be found.");
  return user;
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

const obviousAdultContent = /\b(nude|nudity|porn|pornography|xxx|onlyfans|explicit\s+sex|sexual\s+services|escort\s+services)\b/i;

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
        city: card.city,
        state: card.state,
        country: card.country,
        zipcode: card.zipcode,
        price: card.price,
        phone: card.phone,
        email: card.email,
        website: card.website,
        instagram: card.instagram,
        facebook: card.facebook,
        tiktok: card.tiktok,
        linkedin: card.linkedin,
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

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return [];

    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).order("desc").take(100);
    return Promise.all(cards.map(async (card) => {
      const urls = await Promise.all(card.imageIds.map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId)));
      const effectiveStatus = card.status === "published" && card.expiresAt <= Date.now() ? "expired" : card.status;
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
        instagram: card.instagram,
        facebook: card.facebook,
        tiktok: card.tiktok,
        linkedin: card.linkedin,
        theme: card.theme,
        images: urls.filter((url): url is string => url !== null),
        x: card.x,
        y: card.y,
        rotation: card.rotation,
        width: card.width,
        zIndex: card.zIndex,
        status: effectiveStatus,
        positionLockedAt: card.positionLockedAt,
        createdAt: card.createdAt,
        paidAmount: card.paidAmount,
        expiresAt: card.expiresAt,
        clicks: card.clicks,
      };
    }));
  },
});

export const setVisibility = mutation({
  args: {
    cardId: v.id("cards"),
    status: v.union(v.literal("published"), v.literal("hidden")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) throw new Error("You can only manage your own cards.");
    if (args.status === "published" && card.expiresAt <= Date.now()) throw new Error("Expired cards must be renewed before publishing.");
    if (args.status === "published") {
      const ownerCards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).take(100);
      const otherLiveCard = ownerCards.find((candidate) => candidate._id !== card._id && candidate.status === "published" && candidate.expiresAt > Date.now());
      if (otherLiveCard) throw new Error("Hide your current live card before publishing another one.");
    }
    await ctx.db.patch(card._id, { status: args.status });
    return { success: true };
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
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    linkedin: v.optional(v.string()),
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
    const phone = args.phone?.trim() ?? "";
    const email = args.email?.trim() ?? "";
    if (args.imageIds.length > 2) throw new Error("A card can have at most two images.");
    if (!args.name.trim() || args.name.length > 60) throw new Error("Business name must be between 1 and 60 characters.");
    if (!args.line.trim() || args.line.length > 90) throw new Error("Service description must be between 1 and 90 characters.");
    if (args.message && args.message.length > 300) throw new Error("Message must be 300 characters or fewer.");
    if (obviousAdultContent.test([args.name, args.line, args.message ?? ""].join(" "))) throw new Error("Adult or sexual content is not allowed on WALL.");
    if (!args.area.trim() || args.area.length > 50) throw new Error("Neighborhood must be between 1 and 50 characters.");
    if (!args.city.trim() || args.city.length > 100) throw new Error("City must be specified.");
    if (!args.state.trim() || args.state.length > 100) throw new Error("State must be specified.");
    if (!args.country.trim() || args.country.length > 100) throw new Error("Country must be specified.");
    if (args.zipcode && args.zipcode.length > 20) throw new Error("Zip code must be shorter than 20 characters.");
    if (!phone && !email) throw new Error("Add at least one contact method: phone or email.");
    if (phone && phone.length > 30) throw new Error("Phone number must be 30 characters or fewer.");
    if (phone && !/^[+()0-9.\s-]{7,30}$/.test(phone)) throw new Error("Enter a valid phone number.");
    if (email && (email.length > 120 || !email.includes("@"))) throw new Error("Enter a valid email address.");
    if (args.website && args.website.length > 240) throw new Error("Website must be 240 characters or fewer.");
    if ([args.instagram, args.facebook, args.tiktok, args.linkedin].some((profile) => profile && profile.length > 240)) throw new Error("Social profile links must be 240 characters or fewer.");
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
      phone: phone || undefined,
      email: email || undefined,
      website: args.website?.trim() || undefined,
      instagram: args.instagram?.trim() || undefined,
      facebook: args.facebook?.trim() || undefined,
      tiktok: args.tiktok?.trim() || undefined,
      linkedin: args.linkedin?.trim() || undefined,
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
      phone: phone || undefined,
      email: email || undefined,
      website: args.website?.trim() || undefined,
      instagram: args.instagram?.trim() || undefined,
      facebook: args.facebook?.trim() || undefined,
      tiktok: args.tiktok?.trim() || undefined,
      linkedin: args.linkedin?.trim() || undefined,
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
