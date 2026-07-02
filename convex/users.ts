import { mutation, query, type MutationCtx } from "./_generated/server";

export async function ensureCurrentUserDoc(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const now = Date.now();
  const existing = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      displayName: identity.name ?? existing.displayName,
      email: identity.email ?? existing.email,
      avatarUrl: identity.pictureUrl ?? existing.avatarUrl,
    });
    return existing._id;
  }

  return await ctx.db.insert("users", {
    authProvider: "clerk",
    externalUserId: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    displayName: identity.name,
    email: identity.email,
    avatarUrl: identity.pictureUrl,
    createdAt: now,
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
