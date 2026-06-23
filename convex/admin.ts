import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, env, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

function configuredAdminEmails() {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function getAdminIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.trim().toLowerCase();
  if (!identity || !email || !configuredAdminEmails().has(email)) return null;
  return identity;
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await getAdminIdentity(ctx);
  if (!identity) throw new Error("Administrator access is required.");
  return identity;
}

export const getAccess = query({
  args: {},
  handler: async (ctx) => ({ isAdmin: Boolean(await getAdminIdentity(ctx)) }),
});

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const [cards, users, reports, allCardStats, recentSearches] = await Promise.all([
      ctx.db.query("cards").order("desc").take(150),
      ctx.db.query("users").order("desc").take(150),
      ctx.db.query("reports").withIndex("by_status_and_createdAt", (q) => q.eq("status", "open")).order("desc").take(100),
      ctx.db.query("cardStats").take(500),
      ctx.db.query("searchEvents").withIndex("by_createdAt", (q) => q.gte("createdAt", thirtyDaysAgo)).order("desc").take(1000),
    ]);

    const userById = new Map(users.map((user) => [user._id, user]));
    const cardCountByUser = new Map<string, number>();
    for (const card of cards) {
      const ownerId = String(card.ownerId);
      cardCountByUser.set(ownerId, (cardCountByUser.get(ownerId) ?? 0) + 1);
    }
    const statsMap = new Map(allCardStats.map((s) => [String(s.cardId), s]));

    // Aggregate search terms over the last 30 days
    const keywordCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    for (const search of recentSearches) {
      if (search.keyword) {
        const kw = search.keyword.toLowerCase();
        keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
      }
      if (search.category) {
        categoryCounts.set(search.category, (categoryCounts.get(search.category) ?? 0) + 1);
      }
    }
    const topKeywords = [...keywordCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([keyword, count]) => ({ keyword, count }));
    const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([category, count]) => ({ category, count }));

    return {
      stats: {
        cards: cards.length,
        published: cards.filter((card) => card.status === "published" && card.expiresAt > Date.now()).length,
        users: users.length,
        reports: reports.length,
        searches: recentSearches.length,
      },
      cards: cards.map((card) => {
        const owner = userById.get(card.ownerId);
        const stats = statsMap.get(String(card._id));
        return {
          id: card._id,
          name: card.name,
          line: card.line,
          area: card.area,
          city: card.city,
          state: card.state,
          country: card.country,
          status: card.status === "published" && card.expiresAt <= Date.now() ? "expired" as const : card.status,
          ownerName: owner?.displayName,
          ownerEmail: owner?.email,
          clicks: stats?.clicks ?? card.clicks,
          expiresAt: card.expiresAt,
          createdAt: card.createdAt,
          conversions: stats ? {
            website: stats.websiteClicks,
            phone: stats.phoneClicks,
            email: stats.emailClicks,
            social: stats.socialClicks,
            saves: stats.saves,
            shares: stats.shares,
            total: stats.websiteClicks + stats.phoneClicks + stats.emailClicks + stats.socialClicks + stats.saves + stats.shares,
          } : undefined,
        };
      }),
      users: users.map((user) => ({
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        blockedAt: user.blockedAt,
        blockedReason: user.blockedReason,
        createdAt: user.createdAt,
        cardCount: cardCountByUser.get(String(user._id)) ?? 0,
      })),
      reports: await Promise.all(reports.map(async (report) => {
        const card = await ctx.db.get(report.cardId);
        return { id: report._id, cardId: report.cardId, cardName: card?.name ?? "Deleted card", reason: report.reason, details: report.details, createdAt: report.createdAt };
      })),
      searchInsights: {
        topKeywords,
        topCategories,
        total: recentSearches.length,
      },
    };
  },
});

export const sendTestReminderEmail = action({
  args: { to: v.string() },
  handler: async (ctx, args) => {
    const access = await ctx.runQuery(api.admin.getAccess, {});
    if (!access.isAdmin) throw new Error("Administrator access is required.");

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

    if (!apiKey) throw new Error("RESEND_API_KEY is not configured in Convex environment variables.");

    const renewUrl = `${appUrl}/renew/test-card-id`;
    const tiers = [
      { amount: 0,     name: "Free",     duration: "1 day",    featured: false },
      { amount: 2.99,  name: "Basic",    duration: "30 days",  featured: false },
      { amount: 7.99,  name: "Featured", duration: "90 days",  featured: true  },
      { amount: 24.99, name: "Business", duration: "365 days", featured: false },
    ];

    const tierRows = tiers.map((tier) => {
      const bg = tier.featured ? "#1a1a18" : "#f5f1e8";
      const color = tier.featured ? "#f5f1e8" : "#1a1a18";
      const badge = tier.featured ? " &nbsp;&#9733; Popular" : "";
      const priceLabel = tier.amount === 0 ? "Free" : `$${tier.amount}`;
      return `<tr><td style="padding:5px 0;"><a href="${renewUrl}?amount=${tier.amount}" style="display:block;background:${bg};color:${color};border-radius:7px;padding:14px 18px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;"><strong style="font-weight:700;">${tier.name} &mdash; ${priceLabel}</strong><span style="float:right;opacity:.8;">${tier.duration}${badge}</span></a></td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0ede6;margin:0;padding:24px;"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);"><div style="background:#1a1a18;padding:22px 32px;text-align:center;"><p style="color:#f5f1e8;font-size:22px;font-weight:800;letter-spacing:.15em;margin:0;">WALL</p><p style="color:#888;font-size:11px;letter-spacing:.1em;margin:4px 0 0;">LOCAL ADS, STUCK HERE</p></div><div style="padding:32px 24px 28px;"><p style="margin:0 0 4px;font-size:11px;color:#e67e22;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">&#9888; Test email from admin</p><h2 style="margin:0 0 6px;font-size:20px;color:#1a1a18;">&#9203; 3 days left</h2><p style="color:#666;margin:0 0 24px;font-size:14px;line-height:1.6;"><strong style="color:#1a1a18;">Sample Local Business</strong> expires on Sunday, June 24. Renew it to keep your spot on the wall.</p><p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#999;letter-spacing:.06em;text-transform:uppercase;">Choose a plan</p><table style="width:100%;border-collapse:collapse;">${tierRows}</table><p style="margin:28px 0 0;font-size:12px;color:#bbb;text-align:center;">You received this because you have a card on WALL.</p></div></div></body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [args.to], subject: "TEST — Your WALL card expires in 3 days", html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend rejected the request: ${res.status} ${body}`);
    }
    return { ok: true };
  },
});

export const resolveReport = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("That report no longer exists.");
    await ctx.db.patch(report._id, { status: "resolved" });
    return { success: true };
  },
});

export const setCardStatus = mutation({
  args: {
    cardId: v.id("cards"),
    status: v.union(v.literal("published"), v.literal("hidden")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("That card no longer exists.");
    if (args.status === "published" && card.expiresAt <= Date.now()) throw new Error("Expired cards cannot be restored without renewal.");
    await ctx.db.patch(card._id, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

export const removeCard = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("That card no longer exists.");
    const storedImages = new Set([...card.imageIds, ...(card.thumbnailImageIds ?? [])]);
    await Promise.all([...storedImages].map((imageId) => ctx.storage.delete(imageId)));
    await ctx.db.delete(card._id);
    return { success: true };
  },
});

export const blockUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("That user no longer exists.");

    const now = Date.now();
    await ctx.db.patch(user._id, {
      blockedAt: now,
      blockedReason: "Blocked by admin moderation",
    });

    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", args.userId)).take(500);
    await Promise.all(cards.map(async (card) => {
      if (card.status === "expired") return;
      await ctx.db.patch(card._id, {
        status: "hidden",
        updatedAt: now,
      });
    }));

    return { success: true, hiddenCards: cards.filter((card) => card.status !== "expired").length };
  },
});

export const unblockUser = mutation({
  args: {
    userId: v.id("users"),
    restoreCards: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("That user no longer exists.");

    await ctx.db.patch(user._id, {
      blockedAt: undefined,
      blockedReason: undefined,
    });

    if (!args.restoreCards) {
      return { success: true, restoredCards: 0 };
    }

    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", args.userId)).take(500);
    const now = Date.now();
    let restoredCards = 0;
    await Promise.all(cards.map(async (card) => {
      if (card.status !== "hidden" || card.expiresAt <= now) return;
      restoredCards += 1;
      await ctx.db.patch(card._id, {
        status: "published",
        updatedAt: now,
      });
    }));

    return { success: true, restoredCards };
  },
});
