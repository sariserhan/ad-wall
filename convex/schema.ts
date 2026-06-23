import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authProvider: v.literal("clerk"),
    externalUserId: v.string(),
    tokenIdentifier: v.string(),
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
    businessName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    blockedAt: v.optional(v.number()),
    blockedReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_external_id", ["externalUserId"]),

  cards: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.union(
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
    ),
    line: v.string(),
    message: v.optional(v.string()),
    area: v.string(),
    price: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    location: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    theme: v.union(v.literal("yellow"), v.literal("paper"), v.literal("pink"), v.literal("cyan"), v.literal("dark"), v.literal("cream"), v.literal("biz"), v.literal("kraft"), v.literal("blueprint"), v.literal("photo"), v.literal("ticket")),
    imageMode: v.optional(v.union(v.literal("photo"), v.literal("business-card"))),
    imageIds: v.array(v.id("_storage")),
    thumbnailImageIds: v.optional(v.array(v.id("_storage"))),
    x: v.number(),
    y: v.number(),
    rotation: v.number(),
    width: v.number(),
    zIndex: v.number(),
    status: v.union(v.literal("published"), v.literal("hidden"), v.literal("expired")),
    paidAmount: v.number(),
    expiresAt: v.number(),
    positionLockedAt: v.number(),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
    country: v.string(),
    state: v.string(),
    city: v.string(),
    zipcode: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    clicks: v.number(),
    featuredTier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"))),
    reviewCount: v.optional(v.number()),
    reminder3dSentAt: v.optional(v.number()),
    reminder1dSentAt: v.optional(v.number()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_status_and_country_and_state_and_city_and_createdAt", ["status", "country", "state", "city", "createdAt"])
    .index("by_status_and_expiresAt", ["status", "expiresAt"])
    .index("by_owner", ["ownerId"]),

  pendingCards: defineTable({
    ownerId: v.id("users"),
    payload: v.any(),
    paidAmount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  paymentReceipts: defineTable({
    sessionId: v.string(),
    pendingCardId: v.id("pendingCards"),
    cardId: v.id("cards"),
    paidAmount: v.number(),
    usedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  renewalReceipts: defineTable({
    sessionId: v.string(),
    cardId: v.id("cards"),
    paidAmount: v.number(),
    usedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  reviews: defineTable({
    cardId: v.id("cards"),
    userId: v.id("users"),
    rating: v.number(),
    text: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_card_and_createdAt", ["cardId", "createdAt"])
    .index("by_user_and_card", ["userId", "cardId"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    resetAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  savedCards: defineTable({
    userId: v.id("users"),
    cardId: v.id("cards"),
    createdAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_userId_and_cardId", ["userId", "cardId"])
    .index("by_cardId", ["cardId"]),

  cardStats: defineTable({
    cardId: v.id("cards"),
    clicks: v.number(),
    websiteClicks: v.number(),
    phoneClicks: v.number(),
    emailClicks: v.number(),
    socialClicks: v.number(),
    saves: v.number(),
    shares: v.number(),
    updatedAt: v.number(),
  }).index("by_card", ["cardId"]),

  reports: defineTable({
    cardId: v.id("cards"),
    reporterId: v.optional(v.id("users")),
    reason: v.union(v.literal("spam"), v.literal("scam"), v.literal("inappropriate"), v.literal("expired"), v.literal("other")),
    details: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
  })
    .index("by_card", ["cardId"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),
});
