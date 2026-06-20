import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authProvider: v.literal("clerk"),
    externalUserId: v.string(),
    tokenIdentifier: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_external_id", ["externalUserId"]),

  cards: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.union(v.literal("Services"), v.literal("Food"), v.literal("Home"), v.literal("Classes"), v.literal("Pets"), v.literal("Repairs"), v.literal("Shops")),
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
    imageIds: v.array(v.id("_storage")),
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
    clicks: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_status_and_expiresAt", ["status", "expiresAt"])
    .index("by_owner", ["ownerId"]),
});
