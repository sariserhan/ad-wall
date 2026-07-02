import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";

async function upsertUserDoc(
  ctx: MutationCtx,
  userData: {
    externalUserId: string;
    tokenIdentifier: string;
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    createdAt?: number;
  },
) {
  const existing =
    (await ctx.db.query("users").withIndex("by_external_id", (q) => q.eq("externalUserId", userData.externalUserId)).unique()) ??
    (await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", userData.tokenIdentifier)).unique());

  if (existing) {
    await ctx.db.patch(existing._id, {
      externalUserId: userData.externalUserId,
      tokenIdentifier: userData.tokenIdentifier,
      displayName: userData.displayName ?? existing.displayName,
      email: userData.email ?? existing.email,
      avatarUrl: userData.avatarUrl ?? existing.avatarUrl,
    });
    return existing._id;
  }

  return await ctx.db.insert("users", {
    authProvider: "clerk",
    externalUserId: userData.externalUserId,
    tokenIdentifier: userData.tokenIdentifier,
    displayName: userData.displayName ?? undefined,
    email: userData.email ?? undefined,
    avatarUrl: userData.avatarUrl ?? undefined,
    createdAt: userData.createdAt ?? Date.now(),
  });
}

export async function ensureCurrentUserDoc(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await upsertUserDoc(ctx, {
    externalUserId: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    displayName: identity.name,
    email: identity.email,
    avatarUrl: identity.pictureUrl,
    createdAt: Date.now(),
  });
}

export const getMyCustomerId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    return user?.stripeCustomerId ?? null;
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    return ensureCurrentUserDoc(ctx);
  },
});

export const upsertFromClerkWebhook = internalMutation({
  args: {
    externalUserId: v.string(),
    tokenIdentifier: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return upsertUserDoc(ctx, {
      externalUserId: args.externalUserId,
      tokenIdentifier: args.tokenIdentifier,
      displayName: args.displayName,
      email: args.email,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
  },
});

export const deleteFromClerkWebhook = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing =
      (await ctx.db.query("users").withIndex("by_external_id", (q) => q.eq("externalUserId", args.clerkUserId)).unique()) ??
      (await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", args.clerkUserId)).unique());
    if (!existing) return null;
    await ctx.db.delete(existing._id);
    return existing._id;
  },
});
