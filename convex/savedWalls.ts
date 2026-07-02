import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ensureCurrentUserDoc } from "./users";

async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
}

async function ensureActiveUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to save walls.");
  let user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user) {
    const userId = await ensureCurrentUserDoc(ctx);
    user = userId ? await ctx.db.get(userId) : null;
  }
  if (!user) throw new Error("Your WALL profile could not be created.");
  if (user.blockedAt) throw new Error("Your account is blocked by WALL admin.");
  return user;
}

export const isSaved = query({
  args: { path: v.string() },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return false;
    const existing = await ctx.db
      .query("savedWalls")
      .withIndex("by_userId_and_path", (q) => q.eq("userId", user._id).eq("path", args.path))
      .unique();
    return existing !== null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("savedWalls")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

export const setSaved = mutation({
  args: { path: v.string(), label: v.string(), saved: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ensureActiveUser(ctx);
    const existing = await ctx.db
      .query("savedWalls")
      .withIndex("by_userId_and_path", (q) => q.eq("userId", user._id).eq("path", args.path))
      .unique();
    if (!args.saved) {
      if (existing) await ctx.db.delete(existing._id);
      return { saved: false };
    }
    if (!existing) {
      await ctx.db.insert("savedWalls", {
        userId: user._id,
        path: args.path,
        label: args.label,
        createdAt: Date.now(),
      });
    } else if (existing.label !== args.label) {
      await ctx.db.patch(existing._id, { label: args.label });
    }
    return { saved: true };
  },
});
