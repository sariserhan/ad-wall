import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const category = v.union(
  v.literal("Services"),
  v.literal("Repairs"),
  v.literal("Home & Garden"),
  v.literal("Food & Catering"),
  v.literal("Pets"),
  v.literal("Classes & Education"),
  v.literal("Shops & Retail"),
  v.literal("Automotive"),
  v.literal("Health & Fitness"),
  v.literal("Beauty & Personal Care"),
  v.literal("Professional Services"),
  v.literal("Technology"),
  v.literal("Events & Entertainment"),
  v.literal("Real Estate"),
  v.literal("Child & Family"),
  v.literal("Community"),
  v.literal("Jobs"),
  v.literal("Dating"),
  v.literal("Buy & Sell Marketplace"),
  v.literal("Vehicles"),
);
const theme = v.union(v.literal("yellow"), v.literal("paper"), v.literal("pink"), v.literal("cyan"), v.literal("dark"), v.literal("cream"), v.literal("biz"), v.literal("kraft"), v.literal("blueprint"), v.literal("photo"), v.literal("ticket"));
const imageMode = v.union(v.literal("photo"), v.literal("business-card"));
const MAX_CARD_Y = 1500;

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

async function requireActiveUser(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (user.blockedAt) {
    throw new Error("Your account is blocked by WALL admin. Contact support for help.");
  }
  return user;
}

const packageDurations: Record<number, number> = {
  0: 1 * 24 * 60 * 60 * 1000,
  2.99: 30 * 24 * 60 * 60 * 1000,
  7.99: 90 * 24 * 60 * 60 * 1000,
  19.99: 90 * 24 * 60 * 60 * 1000,
  24.99: 365 * 24 * 60 * 60 * 1000,
};

function getExpiryDuration(paidAmount: number): number {
  return packageDurations[paidAmount] ?? packageDurations[0];
}

const paymentAmount = v.union(v.literal(0), v.literal(2.99), v.literal(7.99), v.literal(24.99));

const blockedTextContent = /\b(nude|nudity|porn|pornography|xxx|onlyfans|explicit\s+sex|sexual\s+services|escort\s+services|white\s+power|racial\s+purity|race\s+war|kill\s+(?:all\s+)?(?:black|white|asian|jewish|muslim|gay)\s+people|f+[\W_]*[u*]+[\W_]*c+[\W_]*k+(?:ing|ed|er|s)?|sh[i1*]+t+(?:ty|s)?|bullsh[i1*]t|b[i1*]tch(?:es)?|a+s+s+h+o+l+e+s?|bastards?|cunts?|motherf+[\W_]*[u*]+[\W_]*c+[\W_]*k+(?:er|ing|ed|s)?|sluts?|whores?|damn|crap)\b/i;
const socialProfilePattern = /^@?[A-Za-z0-9._-]{2,100}$|^(https?:\/\/)?(www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/\S*)?$/;

function isValidWebUrl(value: string) {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(normalized);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    const latestRequest = await ctx.db.query("verificationRequests").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").first();
    return {
      displayName: user.displayName ?? null,
      username: user.username ?? null,
      businessName: user.businessName ?? null,
      verified: user.verified ?? false,
      verificationStatus: latestRequest?.status ?? null,
    };
  },
});

export const getMyCardDailyStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).take(100);
    const d = new Date();
    const dates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(d);
      day.setUTCDate(day.getUTCDate() - i);
      dates.push(`${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`);
    }
    const fromDate = dates[0];
    const byCard: Record<string, number[]> = {};
    for (const card of cards) {
      const rows = await ctx.db.query("dailyCardStats").withIndex("by_card_and_date", (q) => q.eq("cardId", card._id).gte("date", fromDate)).collect();
      const dayMap = new Map(rows.map((r) => [r.date, r.clicks]));
      byCard[String(card._id)] = dates.map((date) => dayMap.get(date) ?? 0);
    }
    return { dates, byCard };
  },
});

export const updateProfile = mutation({
  args: { username: v.optional(v.string()), businessName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const username = args.username?.trim() || undefined;
    const businessName = args.businessName?.trim() || undefined;
    if (username && username.length > 40) throw new Error("Username must be 40 characters or fewer.");
    if (businessName && businessName.length > 60) throw new Error("Business name must be 60 characters or fewer.");
    await ctx.db.patch(user._id, { username, businessName });
    const ownerName = businessName || username || undefined;
    const myCards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    await Promise.all(myCards.map((card) => ctx.db.patch(card._id, { ownerName })));
  },
});

export const listPublished = query({
  args: { country: v.optional(v.string()), state: v.optional(v.string()), city: v.optional(v.string()), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cat = args.category && args.category !== "All" ? args.category : undefined;
    const cards = args.country && args.state && args.city && cat
      ? await ctx.db.query("cards").withIndex("by_status_country_state_city_category_createdAt", (q) => q.eq("status", "published").eq("country", args.country!).eq("state", args.state!).eq("city", args.city!).eq("category", cat as any)).order("desc").collect()
      : args.country && args.state && args.city
      ? await ctx.db.query("cards").withIndex("by_status_and_country_and_state_and_city_and_createdAt", (q) => q.eq("status", "published").eq("country", args.country!).eq("state", args.state!).eq("city", args.city!)).order("desc").collect()
      : args.country && args.state
      ? await ctx.db.query("cards").withIndex("by_status_and_country_and_state_and_city_and_createdAt", (q) => q.eq("status", "published").eq("country", args.country!).eq("state", args.state!)).order("desc").collect()
      : args.country
      ? await ctx.db.query("cards").withIndex("by_status_and_country_and_state_and_city_and_createdAt", (q) => q.eq("status", "published").eq("country", args.country!)).order("desc").collect()
      : await ctx.db.query("cards").withIndex("by_status_created", (q) => q.eq("status", "published")).order("desc").collect();

    const visibleCards = cards.filter((card) => card.expiresAt > now);

    const uniqueOwnerIds = [...new Set(visibleCards.map((c) => String(c.ownerId)))];
    const owners = await Promise.all(uniqueOwnerIds.map((id) => ctx.db.get(id as Id<"users">)));
    const verifiedOwnerIds = new Set(owners.filter((u) => u?.verified).map((u) => String(u!._id)));

    return Promise.all(visibleCards.map(async (card) => {
      const [urls, thumbnailUrls] = await Promise.all([
        Promise.all(card.imageIds.map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
        Promise.all((card.thumbnailImageIds ?? []).map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
      ]);
      return {
        id: card._id,
        ownerId: card.ownerId,
        name: card.name,
        category: card.category,
        subcategory: card.subcategory,
        line: card.line,
        message: card.message,
        area: card.area,
        city: card.city,
        state: card.state,
        country: card.country,
        zipcode: card.zipcode,
        neighborhood: card.neighborhood,
        ownerName: card.ownerName,
        price: card.price,
        phone: card.phone,
        email: card.email,
        website: card.website,
        location: card.location,
        instagram: card.instagram,
        facebook: card.facebook,
        tiktok: card.tiktok,
        linkedin: card.linkedin,
        whatsapp: card.whatsapp,
        telegram: card.telegram,
        theme: card.theme,
        imageMode: card.imageMode,
        images: urls.filter((url): url is string => url !== null),
        thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null),
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
        clicks: card.clicks,
        featuredTier: card.featuredTier,
        reviewCount: card.reviewCount ?? 0,
        verified: verifiedOwnerIds.has(String(card.ownerId)),
      };
    }));
  },
});

export const getPublishedById = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card || card.status !== "published" || card.expiresAt <= Date.now()) return null;
    const [urls, thumbnailUrls, stats, owner] = await Promise.all([
      Promise.all(card.imageIds.map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
      Promise.all((card.thumbnailImageIds ?? []).map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
      ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", card._id)).unique(),
      ctx.db.get(card.ownerId),
    ]);
    return {
      id: card._id,
      ownerId: card.ownerId,
      name: card.name,
      category: card.category,
      subcategory: card.subcategory,
      line: card.line,
      message: card.message,
      area: card.area,
      city: card.city,
      state: card.state,
      country: card.country,
      zipcode: card.zipcode,
      neighborhood: card.neighborhood,
      ownerName: card.ownerName,
      price: card.price,
      phone: card.phone,
      email: card.email,
      website: card.website,
      location: card.location,
      instagram: card.instagram,
      facebook: card.facebook,
      tiktok: card.tiktok,
      linkedin: card.linkedin,
      whatsapp: card.whatsapp,
      telegram: card.telegram,
      theme: card.theme,
      imageMode: card.imageMode,
      images: urls.filter((url): url is string => url !== null),
      thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null),
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
      featuredTier: card.featuredTier,
      reviewCount: card.reviewCount ?? 0,
      verified: owner?.verified ?? false,
    };
  },
});

export const getCardForEmbed = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return null;
    const isLive = card.status === "published" && card.expiresAt > Date.now();
    const effectiveStatus = isLive ? "live" : card.status === "published" ? "expired" : card.status;
    const [urls, thumbnailUrls, owner] = await Promise.all([
      isLive ? Promise.all(card.imageIds.map((id: Id<"_storage">) => ctx.storage.getUrl(id))) : Promise.resolve([]),
      isLive ? Promise.all((card.thumbnailImageIds ?? []).map((id: Id<"_storage">) => ctx.storage.getUrl(id))) : Promise.resolve([]),
      ctx.db.get(card.ownerId),
    ]);
    return {
      id: card._id,
      name: card.name,
      category: card.category,
      line: card.line,
      area: card.area,
      city: card.city,
      state: card.state,
      price: isLive ? (card.price ?? null) : null,
      phone: isLive ? (card.phone ?? null) : null,
      email: isLive ? (card.email ?? null) : null,
      website: isLive ? (card.website ?? null) : null,
      theme: card.theme,
      images: urls.filter((u): u is string => u !== null),
      thumbnailImages: thumbnailUrls.filter((u): u is string => u !== null),
      verified: isLive ? (owner?.verified ?? false) : false,
      ownerName: card.ownerName ?? null,
      status: effectiveStatus as "live" | "expired" | "hidden",
      expiresAt: card.expiresAt,
    };
  },
});

export const getLiveViewCounts = query({
  args: { cardIds: v.array(v.id("cards")) },
  handler: async (ctx, args) => {
    return await Promise.all(args.cardIds.map(async (cardId) => {
      const stats = await ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", cardId)).unique();
      if (stats) return { id: cardId, clicks: stats.clicks, likes: stats.likes ?? 0 };
      const card = await ctx.db.get(cardId);
      return { id: cardId, clicks: card?.clicks ?? 0, likes: 0 };
    }));
  },
});

export const toggleLike = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to like cards.");
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new Error("Your profile could not be found.");
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");

    const existing = await ctx.db.query("cardLikes").withIndex("by_user_and_card", (q) => q.eq("userId", user._id).eq("cardId", args.cardId)).unique();
    let stats = await ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", args.cardId)).unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      if (stats) await ctx.db.patch(stats._id, { likes: Math.max(0, (stats.likes ?? 0) - 1), updatedAt: Date.now() });
      return { liked: false };
    }

    await ctx.db.insert("cardLikes", { userId: user._id, cardId: args.cardId, createdAt: Date.now() });
    if (stats) {
      await ctx.db.patch(stats._id, { likes: (stats.likes ?? 0) + 1, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("cardStats", { cardId: args.cardId, clicks: card.clicks ?? 0, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, likes: 1, updatedAt: Date.now() });
    }
    return { liked: true };
  },
});

export const getLikedCards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as Id<"cards">[];
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return [] as Id<"cards">[];
    const likes = await ctx.db.query("cardLikes").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(500);
    return likes.map((l) => l.cardId);
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

    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).order("desc").collect();
    return Promise.all(cards.map(async (card) => {
      const [urls, thumbnailUrls, stats] = await Promise.all([
        Promise.all(card.imageIds.map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
        Promise.all((card.thumbnailImageIds ?? []).map((imageId: Id<"_storage">) => ctx.storage.getUrl(imageId))),
        ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", card._id)).unique(),
      ]);
      const effectiveStatus = card.status === "published" && card.expiresAt <= Date.now() ? "expired" : card.status;
      return {
        id: card._id,
        ownerId: card.ownerId,
        name: card.name,
        category: card.category,
        subcategory: card.subcategory,
        line: card.line,
        message: card.message,
        area: card.area,
        city: card.city,
        state: card.state,
        country: card.country,
        zipcode: card.zipcode,
        neighborhood: card.neighborhood,
        ownerName: card.ownerName,
        price: card.price,
        phone: card.phone,
        email: card.email,
        website: card.website,
        location: card.location,
        instagram: card.instagram,
        facebook: card.facebook,
        tiktok: card.tiktok,
        linkedin: card.linkedin,
        whatsapp: card.whatsapp,
        telegram: card.telegram,
        theme: card.theme,
        imageMode: card.imageMode,
        images: urls.filter((url): url is string => url !== null),
        thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null),
        x: card.x,
        y: card.y,
        rotation: card.rotation,
        width: card.width,
        zIndex: card.zIndex,
        status: effectiveStatus,
        positionLockedAt: card.positionLockedAt,
        updatedAt: card.updatedAt,
        createdAt: card.createdAt,
        paidAmount: card.paidAmount,
        expiresAt: card.expiresAt,
        clicks: stats?.clicks ?? card.clicks,
        websiteClicks: stats?.websiteClicks ?? 0,
        phoneClicks: stats?.phoneClicks ?? 0,
        emailClicks: stats?.emailClicks ?? 0,
        socialClicks: stats?.socialClicks ?? 0,
        saves: stats?.saves ?? 0,
        shares: stats?.shares ?? 0,
        autoRenew: card.autoRenew,
        stripeSubscriptionId: card.stripeSubscriptionId,
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
    const user = await requireActiveUser(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) throw new Error("You can only manage your own cards.");
    if (args.status === "published" && card.expiresAt <= Date.now()) throw new Error("Expired cards must be renewed before publishing.");
    await ctx.db.patch(card._id, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

export const renew = mutation({
  args: {
    cardId: v.id("cards"),
    paidAmount: paymentAmount,
  },
  handler: async (ctx, args) => {
    if (args.paidAmount !== 0) throw new Error("Paid renewals must be completed through verified checkout.");
    const user = await requireActiveUser(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) throw new Error("You can only renew your own cards.");

    const now = Date.now();
    const status = card.status === "hidden" ? "hidden" : "published";
    const expiresAt = Math.max(now, card.expiresAt) + getExpiryDuration(args.paidAmount);

    await ctx.db.patch(card._id, {
      status,
      paidAmount: args.paidAmount,
      expiresAt,
      updatedAt: now,
    });
    return { success: true, status, expiresAt };
  },
});

const EXPIRATION_BATCH_SIZE = 100;

export const markExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const published = await ctx.db
      .query("cards")
      .withIndex("by_status_and_expiresAt", (q) => q.eq("status", "published").lte("expiresAt", now))
      .take(EXPIRATION_BATCH_SIZE);
    const hidden = await ctx.db
      .query("cards")
      .withIndex("by_status_and_expiresAt", (q) => q.eq("status", "hidden").lte("expiresAt", now))
      .take(EXPIRATION_BATCH_SIZE);
    const expired = [...published, ...hidden].slice(0, EXPIRATION_BATCH_SIZE);

    await Promise.all(expired.map((card) => ctx.db.patch(card._id, { status: "expired" as const })));
    if (expired.length === EXPIRATION_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.cards.markExpired, {});
    }
    return { updated: expired.length };
  },
});

export const update = mutation({
  args: {
    cardId: v.id("cards"),
    name: v.string(),
    category,
    subcategory: v.optional(v.string()),
    line: v.string(),
    message: v.optional(v.string()),
    area: v.string(),
    zipcode: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    price: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    location: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    telegram: v.optional(v.string()),
    theme,
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) throw new Error("You can only edit your own cards.");

    const name = args.name.trim();
    const line = args.line.trim();
    const phone = args.phone?.trim() ?? "";
    const email = args.email?.trim() ?? "";
    if (name.length < 2 || name.length > 60) throw new Error("Business name must be between 2 and 60 characters.");
    if (line.length < 5 || line.length > 90) throw new Error("Service description must be between 5 and 90 characters.");
    if (args.message && args.message.length > 300) throw new Error("Message must be 300 characters or fewer.");
    if (blockedTextContent.test([name, line, args.message ?? ""].join(" "))) throw new Error("Profanity, adult, hateful, or sexual content is not allowed on WALL.");
    if (!args.area.trim() || args.area.length > 50) throw new Error("Neighborhood must be between 1 and 50 characters.");
    if (args.zipcode && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(args.zipcode.trim())) throw new Error("Enter a valid zip code.");
    if (!phone && !email) throw new Error("Add at least one contact method: phone or email.");
    if (phone && !/^[+()0-9.\s-]{7,30}$/.test(phone)) throw new Error("Enter a valid phone number.");
    if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Enter a valid email address.");
    if (args.website && (args.website.length > 240 || !isValidWebUrl(args.website.trim()))) throw new Error("Enter a valid website, such as example.com.");
    if (args.location && args.location.length > 300) throw new Error("Location must be 300 characters or fewer.");
    if ([args.instagram, args.facebook, args.tiktok, args.linkedin].some((profile) => profile && (profile.length > 240 || !socialProfilePattern.test(profile.trim())))) throw new Error("Enter valid social usernames or profile URLs.");
    if (args.price && args.price.length > 50) throw new Error("Price must be 50 characters or fewer.");

    await ctx.db.patch(card._id, {
      name,
      category: args.category,
      subcategory: args.subcategory?.trim() || undefined,
      line,
      message: args.message?.trim() || undefined,
      area: args.area.trim(),
      zipcode: args.zipcode?.trim() || undefined,
      neighborhood: args.neighborhood?.trim() || undefined,
      price: args.price?.trim() || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: args.website?.trim() || undefined,
      location: args.location?.trim() || undefined,
      instagram: args.instagram?.trim() || undefined,
      facebook: args.facebook?.trim() || undefined,
      tiktok: args.tiktok?.trim() || undefined,
      linkedin: args.linkedin?.trim() || undefined,
      whatsapp: args.whatsapp?.trim() || undefined,
      telegram: args.telegram?.trim() || undefined,
      theme: args.theme,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const updatePosition = mutation({
  args: {
    cardId: v.id("cards"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) throw new Error("You can only move your own cards.");
    if (!Number.isFinite(args.x) || !Number.isFinite(args.y)) {
      throw new Error("That position is outside the wall.");
    }

    const x = Math.min(100, Math.max(0, args.x));
    const y = Math.min(MAX_CARD_Y, Math.max(0, args.y));
    const positionLockedAt = Date.now();
    await ctx.db.patch(card._id, { x, y, positionLockedAt, updatedAt: positionLockedAt });
    return { success: true, x, y, positionLockedAt };
  },
});

export const remove = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) throw new Error("You can only delete your own cards.");
    const storedImages = new Set<Id<"_storage">>([...card.imageIds, ...(card.thumbnailImageIds ?? [])]);
    await Promise.all([...storedImages].map((imageId) => ctx.storage.delete(imageId)));
    await ctx.db.delete(card._id);
    return { success: true };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category,
    subcategory: v.optional(v.string()),
    line: v.string(),
    message: v.optional(v.string()),
    area: v.string(),
    city: v.string(),
    state: v.string(),
    country: v.string(),
    zipcode: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    price: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    location: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    telegram: v.optional(v.string()),
    paidAmount: v.number(),
    featuredTier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"))),
    theme,
    imageMode: v.optional(imageMode),
    imageIds: v.array(v.id("_storage")),
    thumbnailImageIds: v.optional(v.array(v.id("_storage"))),
    x: v.number(),
    y: v.number(),
    rotation: v.number(),
    width: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const phone = args.phone?.trim() ?? "";
    const email = args.email?.trim() ?? "";
    const featuredPrices: Record<string, number> = { bronze: 2.99, silver: 4.99, gold: 9.99 };
    const featuredPaidAmount = args.featuredTier ? (featuredPrices[args.featuredTier] ?? 0) : 0;
    const totalPaidAmount = args.paidAmount + featuredPaidAmount;
    if (args.imageIds.length > 2) throw new Error("A card can have at most two images.");
    if (args.thumbnailImageIds && args.thumbnailImageIds.length !== args.imageIds.length) throw new Error("Each full image needs a matching thumbnail.");
    if (args.imageMode === "business-card" && args.imageIds.length !== 1) throw new Error("A finished business card needs exactly one image.");
    if (args.name.trim().length < 2 || args.name.length > 60) throw new Error("Business name must be between 2 and 60 characters.");
    if (args.line.trim().length < 5 || args.line.length > 90) throw new Error("Service description must be between 5 and 90 characters.");
    if (args.message && args.message.length > 300) throw new Error("Message must be 300 characters or fewer.");
    if (blockedTextContent.test([args.name, args.line, args.message ?? ""].join(" "))) throw new Error("Profanity, adult, or sexual content is not allowed on WALL.");
    if (!args.area.trim() || args.area.length > 50) throw new Error("Neighborhood must be between 1 and 50 characters.");
    const isBundlePending = args.paidAmount === 19.99;
    if (!isBundlePending && (!args.city.trim() || args.city.length > 100)) throw new Error("City must be specified.");
    if (!isBundlePending && (!args.state.trim() || args.state.length > 100)) throw new Error("State must be specified.");
    if (!args.country.trim() || args.country.length > 100) throw new Error("Country must be specified.");
    if (args.zipcode && args.zipcode.length > 20) throw new Error("Zip code must be shorter than 20 characters.");
    if (args.zipcode && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(args.zipcode.trim())) throw new Error("Enter a valid zip code.");
    if (!phone && !email) throw new Error("Add at least one contact method: phone or email.");
    if (phone && phone.length > 30) throw new Error("Phone number must be 30 characters or fewer.");
    if (phone && !/^[+()0-9.\s-]{7,30}$/.test(phone)) throw new Error("Enter a valid phone number.");
    if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Enter a valid email address.");
    if (args.website && (args.website.length > 240 || !isValidWebUrl(args.website.trim()))) throw new Error("Enter a valid website, such as example.com.");
    if (args.location && args.location.length > 300) throw new Error("Location must be 300 characters or fewer.");
    if ([args.instagram, args.facebook, args.tiktok, args.linkedin].some((profile) => profile && (profile.length > 240 || !socialProfilePattern.test(profile.trim())))) throw new Error("Enter valid social usernames or profile URLs.");
    if (args.price && args.price.length > 50) throw new Error("Price must be 50 characters or fewer.");
    if (args.x < 0 || args.x > 88 || args.y < 0 || args.y > 1500) throw new Error("That position is outside the wall.");
    if (![0, 2.99, 7.99, 19.99, 24.99].includes(args.paidAmount)) throw new Error("Invalid payment option.");

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
    if (user.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");

    const createdAt = Date.now();
    const cardWidth = args.imageMode === "business-card" ? 300 : args.width;
    const normalizedPayload = {
      ...args,
      name: args.name.trim(),
      line: args.line.trim(),
      message: args.message?.trim() || undefined,
      area: args.area.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      country: args.country.trim(),
      zipcode: args.zipcode?.trim() || undefined,
      neighborhood: args.neighborhood?.trim() || undefined,
      price: args.price?.trim() || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: args.website?.trim() || undefined,
      location: args.location?.trim() || undefined,
      instagram: args.instagram?.trim() || undefined,
      facebook: args.facebook?.trim() || undefined,
      tiktok: args.tiktok?.trim() || undefined,
      linkedin: args.linkedin?.trim() || undefined,
      whatsapp: args.whatsapp?.trim() || undefined,
      telegram: args.telegram?.trim() || undefined,
      width: cardWidth,
      basePaidAmount: args.paidAmount,
      featuredTier: args.featuredTier,
    };
    if (totalPaidAmount > 0) {
      const pendingCardId = await ctx.db.insert("pendingCards", {
        ownerId: user._id,
        payload: normalizedPayload,
        paidAmount: totalPaidAmount,
        status: "pending",
        createdAt,
        expiresAt: createdAt + 2 * 60 * 60 * 1000,
      });
      return { pendingCardId };
    }
    const expiresAt = createdAt + getExpiryDuration(args.paidAmount);
    const zIndex = createdAt;
    const cardId = await ctx.db.insert("cards", {
      ownerId: user._id,
      name: args.name.trim(),
      category: args.category,
      subcategory: args.subcategory?.trim() || undefined,
      line: args.line.trim(),
      message: args.message?.trim() || undefined,
      area: args.area.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      country: args.country.trim(),
      zipcode: args.zipcode?.trim() || undefined,
      neighborhood: args.neighborhood?.trim() || undefined,
      ownerName: user.businessName || user.username || undefined,
      price: args.price?.trim() || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: args.website?.trim() || undefined,
      location: args.location?.trim() || undefined,
      instagram: args.instagram?.trim() || undefined,
      facebook: args.facebook?.trim() || undefined,
      tiktok: args.tiktok?.trim() || undefined,
      linkedin: args.linkedin?.trim() || undefined,
      whatsapp: args.whatsapp?.trim() || undefined,
      telegram: args.telegram?.trim() || undefined,
      theme: args.theme,
      imageMode: args.imageMode,
      imageIds: args.imageIds,
      thumbnailImageIds: args.thumbnailImageIds,
      x: args.x,
      y: args.y,
      rotation: args.rotation,
      width: cardWidth,
      zIndex,
      status: "published",
      paidAmount: args.paidAmount,
      featuredTier: args.featuredTier,
      reviewCount: 0,
      expiresAt,
      positionLockedAt: createdAt,
      updatedAt: createdAt,
      createdAt,
      clicks: 0,
    });
    await ctx.db.insert("cardStats", { cardId, clicks: 0, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, updatedAt: createdAt });
    const [urls, thumbnailUrls] = await Promise.all([
      Promise.all(args.imageIds.map((imageId) => ctx.storage.getUrl(imageId))),
      Promise.all((args.thumbnailImageIds ?? []).map((imageId) => ctx.storage.getUrl(imageId))),
    ]);
    return {
      id: cardId,
      ownerId: user._id,
      name: args.name.trim(),
      category: args.category,
      subcategory: args.subcategory?.trim() || undefined,
      line: args.line.trim(),
      message: args.message?.trim() || undefined,
      area: args.area.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      country: args.country.trim(),
      zipcode: args.zipcode?.trim() || undefined,
      neighborhood: args.neighborhood?.trim() || undefined,
      ownerName: user.businessName || user.username || undefined,
      price: args.price?.trim() || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: args.website?.trim() || undefined,
      location: args.location?.trim() || undefined,
      instagram: args.instagram?.trim() || undefined,
      facebook: args.facebook?.trim() || undefined,
      tiktok: args.tiktok?.trim() || undefined,
      linkedin: args.linkedin?.trim() || undefined,
      whatsapp: args.whatsapp?.trim() || undefined,
      telegram: args.telegram?.trim() || undefined,
      theme: args.theme,
      imageMode: args.imageMode,
      images: urls.filter((url): url is string => url !== null),
      thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null),
      x: args.x,
      y: args.y,
      rotation: args.rotation,
      width: cardWidth,
      zIndex,
      positionLockedAt: createdAt,
      updatedAt: createdAt,
      createdAt,
      paidAmount: args.paidAmount,
      featuredTier: args.featuredTier,
      reviewCount: 0,
      expiresAt,
      clicks: 0,
    };
  },
});

export const getMyCardForRenewal = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    const card = await ctx.db.get(args.cardId);
    if (!card || card.ownerId !== user._id) return null;
    return {
      id: card._id,
      name: card.name,
      status: card.status,
      expiresAt: card.expiresAt,
      paidAmount: card.paidAmount,
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
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const viewer = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
      if (viewer?._id === card.ownerId) return { success: true, incremented: false, clicks: card.clicks ?? 0 };
    }
    const now = Date.now();
    const d = new Date(now);
    const today = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const [stats, dailyRow] = await Promise.all([
      ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", args.cardId)).unique(),
      ctx.db.query("dailyCardStats").withIndex("by_card_and_date", (q) => q.eq("cardId", args.cardId).eq("date", today)).unique(),
    ]);
    const clicks = (stats?.clicks ?? card.clicks ?? 0) + 1;
    if (stats) await ctx.db.patch(stats._id, { clicks, updatedAt: now });
    else await ctx.db.insert("cardStats", { cardId: card._id, clicks, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, updatedAt: now });
    if (dailyRow) await ctx.db.patch(dailyRow._id, { clicks: dailyRow.clicks + 1 });
    else await ctx.db.insert("dailyCardStats", { cardId: card._id, date: today, clicks: 1 });
    return { success: true, incremented: true, clicks };
  },
});

export const recordEvent = mutation({
  args: { cardId: v.id("cards"), event: v.union(v.literal("website"), v.literal("phone"), v.literal("email"), v.literal("social"), v.literal("save"), v.literal("share")) },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");
    let stats = await ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", args.cardId)).unique();
    if (!stats) {
      const id = await ctx.db.insert("cardStats", { cardId: card._id, clicks: card.clicks ?? 0, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, updatedAt: Date.now() });
      stats = await ctx.db.get(id);
    }
    if (!stats) return null;
    const field = args.event === "website" ? "websiteClicks" : args.event === "phone" ? "phoneClicks" : args.event === "email" ? "emailClicks" : args.event === "social" ? "socialClicks" : args.event === "save" ? "saves" : "shares";
    await ctx.db.patch(stats._id, { [field]: stats[field] + 1, updatedAt: Date.now() });
    return { success: true };
  },
});

export const recordSearch = mutation({
  args: {
    keyword: v.optional(v.string()),
    category: v.optional(v.string()),
    country: v.string(),
    state: v.string(),
    city: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("searchEvents", {
      keyword: args.keyword?.trim().slice(0, 100) || undefined,
      category: args.category && args.category !== "All" ? args.category.slice(0, 60) : undefined,
      country: args.country.slice(0, 10),
      state: args.state.slice(0, 50),
      city: args.city.slice(0, 100),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const report = mutation({
  args: { cardId: v.id("cards"), reason: v.union(v.literal("spam"), v.literal("scam"), v.literal("inappropriate"), v.literal("expired"), v.literal("other")), details: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.details && args.details.length > 500) throw new Error("Report details must be 500 characters or fewer.");
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");
    const identity = await ctx.auth.getUserIdentity();
    const reporter = identity ? await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique() : null;
    await ctx.db.insert("reports", { cardId: card._id, reporterId: reporter?._id, reason: args.reason, details: args.details?.trim() || undefined, status: "open", createdAt: Date.now() });
    return { success: true };
  },
});

export const listPublishedIds = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_status_created", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    return cards
      .filter((c) => c.expiresAt > now)
      .map((c) => ({ id: String(c._id), updatedAt: c.updatedAt ?? c.createdAt }));
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const published = await ctx.db
      .query("cards")
      .withIndex("by_status_created", (q) => q.eq("status", "published"))
      .collect();
    const active = published.filter((c) => c.expiresAt > now);
    const totalListings = active.length;
    const totalBusinesses = new Set(active.map((c) => String(c.ownerId)).filter((id) => id !== "undefined")).size;
    const totalCities = new Set(active.filter((c) => c.city).map((c) => `${c.country}/${c.state}/${c.city}`)).size;
    return { totalListings, totalBusinesses, totalCities };
  },
});

export const getTopCards = query({
  args: {
    type: v.union(v.literal("liked"), v.literal("reviewed"), v.literal("clicked"), v.literal("shared")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 10, 25);
    const now = Date.now();

    if (args.type === "clicked" || args.type === "reviewed") {
      const field = args.type === "clicked" ? "clicks" : "reviewCount";
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_status_created", (q) => q.eq("status", "published"))
        .collect();
      return cards
        .filter((c) => c.expiresAt > now && (c[field] ?? 0) > 0)
        .sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
        .slice(0, limit)
        .map((c) => ({
          id: String(c._id),
          name: c.name,
          category: c.category,
          line: c.line,
          area: c.area,
          city: c.city,
          state: c.state,
          theme: c.theme,
          rotation: c.rotation,
          metric: c[field] ?? 0,
        }));
    }

    // liked / shared — metric lives in cardStats
    const statsField = args.type === "liked" ? "likes" : "shares";
    const allStats = await ctx.db.query("cardStats").collect();
    const sorted = allStats
      .filter((s) => (s[statsField] ?? 0) > 0)
      .sort((a, b) => (b[statsField] ?? 0) - (a[statsField] ?? 0));

    const results: { id: string; name: string; category: string; line: string; area: string; city: string; state: string; theme: string; rotation: number; metric: number }[] = [];
    for (const stat of sorted) {
      if (results.length >= limit) break;
      const card = await ctx.db.get(stat.cardId);
      if (!card || card.status !== "published" || card.expiresAt <= now) continue;
      results.push({
        id: String(card._id),
        name: card.name,
        category: card.category,
        line: card.line,
        area: card.area,
        city: card.city,
        state: card.state,
        theme: card.theme,
        rotation: card.rotation,
        metric: stat[statsField] ?? 0,
      });
    }
    return results;
  },
});
