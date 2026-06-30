import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, env, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { deleteCardOwnedData } from "./cardCleanup";

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

async function audit(ctx: MutationCtx, identity: { email?: string | null }, action: string, targetId: string, details?: Record<string, unknown>) {
  await ctx.db.insert("adminAuditLog", {
    adminEmail: identity.email ?? "unknown",
    action,
    targetId,
    details,
    createdAt: Date.now(),
  });
}

export const getAccess = query({
  args: {},
  handler: async (ctx) => ({ isAdmin: Boolean(await getAdminIdentity(ctx)) }),
});

export const resetRateLimitsForUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found.");

    const keyPrefix = `${user.tokenIdentifier}:`;
    const rateLimitRows = await ctx.db.query("rateLimits").take(1000);
    let deleted = 0;
    for (const row of rateLimitRows) {
      if (!row.key.startsWith(keyPrefix)) continue;
      await ctx.db.delete(row._id);
      deleted += 1;
    }

    await audit(ctx, identity, "resetRateLimitsForUser", String(args.userId), {
      deleted,
      username: user.username ?? user.businessName ?? user.displayName ?? user.email ?? null,
    });

    return { deleted };
  },
});

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const [cards, users, reports, bugReports, contactMessages, allCardStats, recentSearches, verificationRequests, authEvents, recentWallVisits] = await Promise.all([
      ctx.db.query("cards").order("desc").take(150),
      ctx.db.query("users").order("desc").take(1000),
      ctx.db.query("reports").withIndex("by_status_and_createdAt", (q) => q.eq("status", "open")).order("desc").take(100),
      ctx.db.query("bugReports").withIndex("by_status_and_createdAt", (q) => q.eq("status", "open")).order("desc").take(100),
      ctx.db.query("contactMessages").withIndex("by_status_and_createdAt", (q) => q.eq("status", "open")).order("desc").take(100),
      ctx.db.query("cardStats").take(500),
      ctx.db.query("searchEvents").withIndex("by_createdAt", (q) => q.gte("createdAt", thirtyDaysAgo)).order("desc").take(1000),
      ctx.db.query("verificationRequests").order("desc").take(100),
      ctx.db.query("authEvents").withIndex("by_createdAt", (q) => q.gte("createdAt", thirtyDaysAgo)).order("desc").take(1000),
      ctx.db.query("wallVisits").withIndex("by_visitedAt", (q) => q.gte("visitedAt", thirtyDaysAgo)).order("desc").take(1000),
    ]);

    const userById = new Map(users.map((user) => [String(user._id), user] as const));
    const cardCountByUser = new Map<string, number>();
    for (const card of cards) {
      const ownerId = String(card.ownerId);
      cardCountByUser.set(ownerId, (cardCountByUser.get(ownerId) ?? 0) + 1);
    }
    const statsMap = new Map(allCardStats.map((s) => [String(s.cardId), s]));

    const formatLocation = (country: string, state: string, city: string) => [city, state, country].filter(Boolean).join(", ");

    // Aggregate search terms over the last 30 days
    const keywordCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    for (const search of recentSearches) {
      if (search.keyword) {
        const kw = search.keyword.toLowerCase();
        keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
      }
      if (search.category) {
        categoryCounts.set(search.category, (categoryCounts.get(search.category) ?? 0) + 1);
      }
      const location = formatLocation(search.country, search.state, search.city);
      locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);
    }
    const topKeywords = [...keywordCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([keyword, count]) => ({ keyword, count }));
    const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([category, count]) => ({ category, count }));
    const topSearchLocations = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([location, count]) => ({ location, count }));

    const loginCountsByUser = new Map<string, number>();
    const loginCountsByDay = new Map<string, number>();
    for (const event of authEvents) {
      loginCountsByUser.set(String(event.userId), (loginCountsByUser.get(String(event.userId)) ?? 0) + 1);
      const day = new Date(event.createdAt).toISOString().slice(0, 10);
      loginCountsByDay.set(day, (loginCountsByDay.get(day) ?? 0) + 1);
    }

    const signupCountsByDay = new Map<string, number>();
    for (const user of users) {
      if (user.createdAt < thirtyDaysAgo) continue;
      const day = new Date(user.createdAt).toISOString().slice(0, 10);
      signupCountsByDay.set(day, (signupCountsByDay.get(day) ?? 0) + 1);
    }

    const wallMap = new Map<string, { _id: Id<"walls">; path: string; viewCount: number; createdAt: number; updatedAt: number }>();
    for (const wall of await ctx.db.query("walls").collect()) {
      wallMap.set(String(wall._id), wall);
    }
    const wallVisitCounts = new Map<string, { visits: number; uniqueUsers: Set<string>; lastVisitedAt: number }>();
    for (const visit of recentWallVisits) {
      const current = wallVisitCounts.get(String(visit.wallId)) ?? { visits: 0, uniqueUsers: new Set<string>(), lastVisitedAt: 0 };
      current.visits += 1;
      if (visit.userId) current.uniqueUsers.add(String(visit.userId));
      current.lastVisitedAt = Math.max(current.lastVisitedAt, visit.visitedAt);
      wallVisitCounts.set(String(visit.wallId), current);
    }
    const topWalls = [...wallVisitCounts.entries()]
      .map(([wallId, stats]) => {
        const wall = wallMap.get(wallId);
        return wall ? {
          path: wall.path,
          visits: stats.visits,
          uniqueUsers: stats.uniqueUsers.size,
          lastVisitedAt: stats.lastVisitedAt,
        } : null;
      })
      .filter((wall): wall is { path: string; visits: number; uniqueUsers: number; lastVisitedAt: number } => Boolean(wall))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    const recentLoginUsers = [...loginCountsByUser.entries()]
      .map(([userId, count]) => {
        const user = userById.get(userId);
        return {
          id: user?._id ?? userId,
          label: user?.displayName || user?.businessName || user?.username || user?.email || "Unknown user",
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      stats: {
        cards: cards.length,
        published: cards.filter((card) => card.status === "published" && card.expiresAt > Date.now()).length,
        users: users.length,
        reports: reports.length,
        bugs: bugReports.length,
        messages: contactMessages.length,
        searches: recentSearches.length,
        logins: authEvents.length,
        wallVisits: recentWallVisits.length,
        pendingVerifications: verificationRequests.filter((r) => r.status === "pending").length,
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
        username: card.username ?? owner?.username,
        ownerName: owner?.businessName || owner?.username || owner?.displayName || owner?.email,
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
        username: user.username,
        businessName: user.businessName,
        email: user.email,
        blockedAt: user.blockedAt,
        blockedReason: user.blockedReason,
        verified: user.verified ?? false,
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
        cardCount: cardCountByUser.get(String(user._id)) ?? 0,
      })),
      reports: await Promise.all(reports.map(async (report) => {
        const card = await ctx.db.get(report.cardId);
        return { id: report._id, cardId: report.cardId, cardName: card?.name ?? "Deleted card", reason: report.reason, details: report.details, createdAt: report.createdAt };
      })),
      bugReports: bugReports.map((bugReport) => {
        const reporter = bugReport.reporterId ? userById.get(bugReport.reporterId) : null;
        return {
          id: bugReport._id,
          page: bugReport.page,
          reason: bugReport.reason,
          details: bugReport.details,
          reporterName: reporter?.businessName || reporter?.username || reporter?.displayName || reporter?.email,
          reporterEmail: reporter?.email,
          createdAt: bugReport.createdAt,
        };
      }),
      contactMessages: contactMessages.map((contactMessage) => {
        const reporter = contactMessage.reporterId ? userById.get(contactMessage.reporterId) : null;
        return {
          id: contactMessage._id,
          page: contactMessage.page,
          topic: contactMessage.topic,
          message: contactMessage.message,
          reporterName: reporter?.businessName || reporter?.username || contactMessage.reporterDisplayName || reporter?.displayName,
          reporterUsername: reporter?.username ?? contactMessage.reporterUsername ?? undefined,
          reporterEmail: reporter?.email ?? contactMessage.reporterEmail ?? undefined,
          reporterBusinessName: reporter?.businessName ?? contactMessage.reporterBusinessName ?? undefined,
          reporterPhone: contactMessage.reporterPhone ?? undefined,
          createdAt: contactMessage.createdAt,
        };
      }),
      searchInsights: {
        topKeywords,
        topCategories,
        topLocations: topSearchLocations,
        total: recentSearches.length,
      },
      wallInsights: {
        totalVisits: recentWallVisits.length,
        topWalls,
        recentVisits: recentWallVisits.slice(0, 12).map((visit) => ({
          wallId: visit.wallId,
          path: wallMap.get(String(visit.wallId))?.path ?? "Unknown wall",
          visitedAt: visit.visitedAt,
          userName: visit.userId ? (userById.get(visit.userId)?.displayName || userById.get(visit.userId)?.username || userById.get(visit.userId)?.businessName || userById.get(visit.userId)?.email || "Signed-in user") : "Guest",
        })),
      },
      userInsights: {
        totalLogins: authEvents.length,
        dailyLogins: [...loginCountsByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
        dailySignups: [...signupCountsByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
        topLoginUsers: recentLoginUsers,
      },
      verificationRequests: verificationRequests.map((req) => {
        const user = userById.get(req.userId);
        return {
          id: req._id,
          userId: req.userId,
          status: req.status,
          plan: req.plan,
          paidAmount: req.paidAmount,
          userName: user?.businessName || user?.username || user?.displayName || user?.email,
          userEmail: user?.email,
          createdAt: req.createdAt,
          reviewedAt: req.reviewedAt,
          rejectedReason: req.rejectedReason,
        };
      }),
    };
  },
});

export const playgroundStoreImageFromUrl = action({
  args: { imageUrl: v.string() },
  handler: async (ctx, args) => {
    const access: { isAdmin: boolean } = await ctx.runQuery(api.admin.getAccess, {});
    if (!access.isAdmin) throw new Error("Administrator access is required.");
    const imageUrl = args.imageUrl.trim();
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Image URL must start with http:// or https://.");
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Could not download image: ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error("Image URL must point to an image.");
    }
    const storageId = await ctx.storage.store(await response.blob());
    return { storageId };
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

export const setUserVerified = mutation({
  args: { userId: v.id("users"), verified: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("That user no longer exists.");
    await ctx.db.patch(user._id, {
      verified: args.verified || undefined,
      verifiedAt: args.verified ? Date.now() : undefined,
    });
    return { success: true };
  },
});

export const approveVerification = mutation({
  args: { requestId: v.id("verificationRequests") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("That verification request no longer exists.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");
    const now = Date.now();
    await ctx.db.patch(request._id, { status: "approved", reviewedAt: now });
    await ctx.db.patch(request.userId, { verified: true, verifiedAt: now });
    return { success: true };
  },
});

export const rejectVerification = mutation({
  args: { requestId: v.id("verificationRequests"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("That verification request no longer exists.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");
    await ctx.db.patch(request._id, { status: "rejected", reviewedAt: Date.now(), rejectedReason: args.reason });
    return { success: true };
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

export const resolveBugReport = mutation({
  args: { bugReportId: v.id("bugReports") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const bugReport = await ctx.db.get(args.bugReportId);
    if (!bugReport) throw new Error("That bug report no longer exists.");
    await ctx.db.patch(bugReport._id, { status: "resolved" });
    return { success: true };
  },
});

export const resolveContactMessage = mutation({
  args: { contactMessageId: v.id("contactMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const contactMessage = await ctx.db.get(args.contactMessageId);
    if (!contactMessage) throw new Error("That contact message no longer exists.");
    await ctx.db.patch(contactMessage._id, { status: "resolved" });
    return { success: true };
  },
});

export const setCardStatus = mutation({
  args: {
    cardId: v.id("cards"),
    status: v.union(v.literal("published"), v.literal("hidden")),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("That card no longer exists.");
    if (args.status === "published" && card.expiresAt <= Date.now()) throw new Error("Expired cards cannot be restored without renewal.");
    await ctx.db.patch(card._id, { status: args.status, updatedAt: Date.now() });
    await audit(ctx, identity, "setCardStatus", args.cardId, { from: card.status, to: args.status });
    return { success: true };
  },
});

export const removeCard = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("That card no longer exists.");
    await audit(ctx, identity, "removeCard", args.cardId, { name: card.name, ownerId: card.ownerId });
    const storedImages = new Set([...card.imageIds, ...(card.thumbnailImageIds ?? []), ...(card.backImageIds ?? []), ...(card.backThumbnailImageIds ?? [])]);
    await Promise.all([...storedImages].map((imageId) => ctx.storage.delete(imageId)));
    await deleteCardOwnedData(ctx, card._id);
    await ctx.db.delete(card._id);
    return { success: true };
  },
});

export const purgeOrphanCardData = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const cards = await ctx.db.query("cards").collect();
    const liveCardIds = new Set(cards.map((card) => String(card._id)));

    const [reviews, savedCards, cardLikes, cardStats, dailyCardStats] = await Promise.all([
      ctx.db.query("reviews").collect(),
      ctx.db.query("savedCards").collect(),
      ctx.db.query("cardLikes").collect(),
      ctx.db.query("cardStats").collect(),
      ctx.db.query("dailyCardStats").collect(),
    ]);

    const orphanReviews = reviews.filter((row) => !liveCardIds.has(String(row.cardId)));
    const orphanSavedCards = savedCards.filter((row) => !liveCardIds.has(String(row.cardId)));
    const orphanLikes = cardLikes.filter((row) => !liveCardIds.has(String(row.cardId)));
    const orphanStats = cardStats.filter((row) => !liveCardIds.has(String(row.cardId)));
    const orphanDailyStats = dailyCardStats.filter((row) => !liveCardIds.has(String(row.cardId)));

    await Promise.all([
      ...orphanReviews.map((row) => ctx.db.delete(row._id)),
      ...orphanSavedCards.map((row) => ctx.db.delete(row._id)),
      ...orphanLikes.map((row) => ctx.db.delete(row._id)),
      ...orphanStats.map((row) => ctx.db.delete(row._id)),
      ...orphanDailyStats.map((row) => ctx.db.delete(row._id)),
    ]);

    return {
      deleted: {
        reviews: orphanReviews.length,
        savedCards: orphanSavedCards.length,
        cardLikes: orphanLikes.length,
        cardStats: orphanStats.length,
        dailyCardStats: orphanDailyStats.length,
      },
    };
  },
});

const DELETE_OWNER_BATCH_SIZE = 50;

export const deleteCardsByOwnerBatch = internalMutation({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).take(DELETE_OWNER_BATCH_SIZE);
    for (const card of cards) {
      const storedImages = new Set([...card.imageIds, ...(card.thumbnailImageIds ?? []), ...(card.backImageIds ?? []), ...(card.backThumbnailImageIds ?? [])]);
      for (const imageId of storedImages) {
        await ctx.storage.delete(imageId);
      }
      await deleteCardOwnedData(ctx, card._id);
      await ctx.db.delete(card._id);
    }
    if (cards.length === DELETE_OWNER_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.admin.deleteCardsByOwnerBatch, { ownerId: args.ownerId });
    }
    return { deleted: cards.length, scheduledMore: cards.length === DELETE_OWNER_BATCH_SIZE };
  },
});

export const deleteAllCardsByOwner = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("That user no longer exists.");
    await audit(ctx, identity, "deleteAllCardsByOwner", args.userId, {
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      businessName: user.businessName,
    });
    const result: { deleted: number; scheduledMore: boolean } = await ctx.runMutation(internal.admin.deleteCardsByOwnerBatch, { ownerId: args.userId });
    return { success: true, deleted: result.deleted, scheduledMore: result.scheduledMore };
  },
});

export const blockUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("That user no longer exists.");

    const now = Date.now();
    await ctx.db.patch(user._id, {
      blockedAt: now,
      blockedReason: "Blocked by admin moderation",
    });
    await audit(ctx, identity, "blockUser", args.userId, { email: user.email, displayName: user.displayName });

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
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("That user no longer exists.");
    await audit(ctx, identity, "unblockUser", args.userId, { email: user.email, restoreCards: args.restoreCards ?? false });

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

export const getAuditLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("adminAuditLog").withIndex("by_createdAt").order("desc").take(args.limit ?? 100);
  },
});

// ─── Admin Playground ────────────────────────────────────────────────────────

const PG_DURATIONS: Record<number, number> = {
  0:     1  * 24 * 60 * 60 * 1000,
  2.99:  30 * 24 * 60 * 60 * 1000,
  7.99:  90 * 24 * 60 * 60 * 1000,
  19.99: 90 * 24 * 60 * 60 * 1000,
  24.99: 365 * 24 * 60 * 60 * 1000,
};

const PG_ADMIN_STATUS = v.union(v.literal("published"), v.literal("hidden"), v.literal("expired"));
const PG_ADMIN_CATEGORY = v.union(
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
const PG_ADMIN_THEME = v.union(v.literal("yellow"), v.literal("paper"), v.literal("pink"), v.literal("cyan"), v.literal("dark"), v.literal("cream"), v.literal("biz"), v.literal("kraft"), v.literal("blueprint"), v.literal("photo"), v.literal("ticket"));
const PG_ADMIN_IMAGE_MODE = v.union(v.literal("photo"), v.literal("business-card"));
const PG_ADMIN_CARD_SHAPE = v.optional(v.union(v.literal("vertical"), v.literal("horizontal"), v.literal("square")));
const PG_ADMIN_FEATURED_TIER = v.optional(v.union(v.literal("boost"), v.literal("bronze"), v.literal("silver"), v.literal("gold")));
const PG_ONE_DAY_MS = 24 * 60 * 60 * 1000;

const PG_ADMIN_CARD_ARGS = {
  name: v.string(),
  category: PG_ADMIN_CATEGORY,
  subcategory: v.optional(v.string()),
  line: v.string(),
  message: v.optional(v.string()),
  area: v.optional(v.string()),
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
  ownerName: v.optional(v.string()),
  imageIds: v.optional(v.array(v.id("_storage"))),
  thumbnailImageIds: v.optional(v.array(v.id("_storage"))),
  backImageIds: v.optional(v.array(v.id("_storage"))),
  backThumbnailImageIds: v.optional(v.array(v.id("_storage"))),
  theme: PG_ADMIN_THEME,
  imageMode: v.optional(PG_ADMIN_IMAGE_MODE),
  cardShape: PG_ADMIN_CARD_SHAPE,
  imageX: v.optional(v.number()),
  imageY: v.optional(v.number()),
  imageWidth: v.optional(v.number()),
  imageHeight: v.optional(v.number()),
  backImageX: v.optional(v.number()),
  backImageY: v.optional(v.number()),
  backImageScale: v.optional(v.number()),
  paidAmount: v.number(),
  featuredTier: PG_ADMIN_FEATURED_TIER,
  status: v.optional(PG_ADMIN_STATUS),
  durationDays: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  clicks: v.optional(v.number()),
  likes: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  websiteClicks: v.optional(v.number()),
  phoneClicks: v.optional(v.number()),
  emailClicks: v.optional(v.number()),
  socialClicks: v.optional(v.number()),
  saves: v.optional(v.number()),
  shares: v.optional(v.number()),
  x: v.optional(v.number()),
  y: v.optional(v.number()),
  rotation: v.optional(v.number()),
  width: v.optional(v.number()),
  pending: v.optional(v.boolean()),
};

type PlaygroundCardArgs = {
  name: string;
  category: string;
  subcategory?: string;
  line: string;
  message?: string;
  area?: string;
  city: string;
  state: string;
  country: string;
  zipcode?: string;
  neighborhood?: string;
  price?: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  whatsapp?: string;
  telegram?: string;
  ownerName?: string;
  theme: string;
  imageIds?: Id<"_storage">[];
  thumbnailImageIds?: Id<"_storage">[];
  backImageIds?: Id<"_storage">[];
  backThumbnailImageIds?: Id<"_storage">[];
  imageMode?: "photo" | "business-card";
  cardShape?: "vertical" | "horizontal" | "square";
  imageX?: number;
  imageY?: number;
  imageWidth?: number;
  imageHeight?: number;
  backImageX?: number;
  backImageY?: number;
  backImageScale?: number;
  paidAmount: number;
  featuredTier?: "boost" | "bronze" | "silver" | "gold";
  status?: "published" | "hidden" | "expired";
  durationDays?: number;
  expiresAt?: number;
  clicks?: number;
  likes?: number;
  reviewCount?: number;
  websiteClicks?: number;
  phoneClicks?: number;
  emailClicks?: number;
  socialClicks?: number;
  saves?: number;
  shares?: number;
  x?: number;
  y?: number;
  rotation?: number;
  width?: number;
  pending?: boolean;
};

async function createPlaygroundCard(ctx: MutationCtx, userId: Id<"users">, args: PlaygroundCardArgs) {
  const now = Date.now();
  const user = await ctx.db.get(userId);
  const baseArea = (args.area?.trim() || args.neighborhood?.trim() || args.city.trim());
  const rotation = args.rotation ?? 0;
  const cardWidth = args.width ?? (args.imageMode === "business-card" ? (args.cardShape === "vertical" ? 240 : args.cardShape === "square" ? 284 : 336) : 220);
  const x = args.x ?? (4 + Math.random() * 82);
  const y = args.y ?? (40 + Math.random() * 1400);
  const status = args.status ?? (args.pending ? "hidden" : "published");
  const expiresAt = args.expiresAt ?? (
    args.durationDays !== undefined
      ? now + Math.max(0, args.durationDays) * PG_ONE_DAY_MS
      : now + (PG_DURATIONS[args.paidAmount] ?? PG_DURATIONS[0])
  );
  const clicks = Math.max(0, Math.floor(args.clicks ?? 0));
  const likes = Math.max(0, Math.floor(args.likes ?? 0));
  const reviewCount = Math.max(0, Math.floor(args.reviewCount ?? 0));
  const websiteClicks = Math.max(0, Math.floor(args.websiteClicks ?? 0));
  const phoneClicks = Math.max(0, Math.floor(args.phoneClicks ?? 0));
  const emailClicks = Math.max(0, Math.floor(args.emailClicks ?? 0));
  const socialClicks = Math.max(0, Math.floor(args.socialClicks ?? 0));
  const saves = Math.max(0, Math.floor(args.saves ?? 0));
  const shares = Math.max(0, Math.floor(args.shares ?? 0));
  const cardId = await ctx.db.insert("cards", {
    ownerId: userId,
    name: args.name.trim(),
    category: args.category as any,
    subcategory: args.subcategory?.trim() || undefined,
    line: args.line.trim(),
    message: args.message?.trim() || undefined,
    area: baseArea.trim(),
    city: args.city.trim(),
    state: args.state.trim(),
    country: args.country.trim(),
    zipcode: args.zipcode?.trim() || undefined,
    neighborhood: args.neighborhood?.trim() || undefined,
    username: user?.username ?? undefined,
    ownerName: args.ownerName?.trim() || undefined,
    price: args.price?.trim() || undefined,
    phone: args.phone?.trim() || undefined,
    email: args.email?.trim() || undefined,
    website: args.website?.trim() || undefined,
    location: args.location?.trim() || undefined,
    instagram: args.instagram?.trim() || undefined,
    facebook: args.facebook?.trim() || undefined,
    tiktok: args.tiktok?.trim() || undefined,
    linkedin: args.linkedin?.trim() || undefined,
    whatsapp: args.whatsapp?.trim() || undefined,
    telegram: args.telegram?.trim() || undefined,
    theme: args.theme as any,
    imageMode: args.imageMode,
    cardShape: args.cardShape,
    imageX: args.imageX,
    imageY: args.imageY,
    imageWidth: args.imageWidth,
    imageHeight: args.imageHeight,
    backImageX: args.backImageX,
    backImageY: args.backImageY,
    backImageScale: args.backImageScale,
    imageIds: args.imageIds ?? [],
    thumbnailImageIds: args.thumbnailImageIds,
    backImageIds: args.backImageIds,
    backThumbnailImageIds: args.backThumbnailImageIds,
    x,
    y,
    rotation,
    width: cardWidth,
    zIndex: now,
    status,
    paidAmount: args.paidAmount,
    expiresAt,
    positionLockedAt: now,
    updatedAt: now,
    createdAt: now,
    clicks,
    reviewCount,
    ...(args.featuredTier ? { featuredTier: args.featuredTier } : {}),
  });

  await ctx.db.insert("cardStats", {
    cardId,
    clicks,
    websiteClicks,
    phoneClicks,
    emailClicks,
    socialClicks,
    saves,
    shares,
    likes,
    updatedAt: now,
  });

  return { cardId, expiresAt, status, likes, clicks, reviewCount };
}

export const playgroundGetMyCards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return { cards: [], verified: false };
    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    const stats = await Promise.all(cards.map(async (card) => ({
      cardId: card._id,
      stats: await ctx.db.query("cardStats").withIndex("by_card", (q) => q.eq("cardId", card._id)).unique(),
    })));
    const statsMap = new Map(stats.map(({ cardId, stats }) => [String(cardId), stats]));
    const now = Date.now();
    return {
      cards: cards.map((c) => ({
        id: c._id,
        name: c.name,
        status: c.status === "published" && c.expiresAt <= now ? "expired" : c.status,
        expiresAt: c.expiresAt,
        paidAmount: c.paidAmount,
        featuredTier: c.featuredTier ?? null,
        city: c.city,
        country: c.country,
        createdAt: c.createdAt,
        clicks: statsMap.get(String(c._id))?.clicks ?? c.clicks ?? 0,
        likes: statsMap.get(String(c._id))?.likes ?? 0,
        reviewCount: c.reviewCount ?? 0,
      })),
      verified: user.verified ?? false,
    };
  },
});

export const playgroundCreateCard = mutation({
  args: PG_ADMIN_CARD_ARGS,
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new Error("Admin user not found in database.");
    const result = await createPlaygroundCard(ctx, user._id, args as PlaygroundCardArgs);
    return result;
  },
});

export const playgroundSetExpiry = mutation({
  args: { cardId: v.id("cards"), expiresAt: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");
    const now = Date.now();
    await ctx.db.patch(args.cardId, {
      expiresAt: args.expiresAt,
      status: args.expiresAt > now ? "published" : "expired",
      updatedAt: now,
    });
    return { success: true };
  },
});

export const playgroundSetFeaturedTier = mutation({
  args: { cardId: v.id("cards"), tier: v.optional(v.union(v.literal("boost"), v.literal("bronze"), v.literal("silver"), v.literal("gold"))) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.cardId, { featuredTier: args.tier, updatedAt: Date.now() });
    return { success: true };
  },
});

export const playgroundRenewCard = mutation({
  args: { cardId: v.id("cards"), paidAmount: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");
    const duration = PG_DURATIONS[args.paidAmount] ?? PG_DURATIONS[0];
    const now = Date.now();
    const expiresAt = Math.max(now, card.expiresAt) + duration;
    await ctx.db.patch(args.cardId, { paidAmount: args.paidAmount, expiresAt, status: "published", updatedAt: now });
    return { success: true, expiresAt };
  },
});

export const playgroundSetVerified = mutation({
  args: { verified: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new Error("Admin user not found.");
    await ctx.db.patch(user._id, {
      verified: args.verified || undefined,
      verifiedAt: args.verified ? Date.now() : undefined,
    });
    return { success: true };
  },
});

export const playgroundDeleteCard = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found.");
    const storedImages = new Set([...card.imageIds, ...(card.thumbnailImageIds ?? []), ...(card.backImageIds ?? []), ...(card.backThumbnailImageIds ?? [])]);
    await Promise.all([...storedImages].map((id) => ctx.storage.delete(id)));
    await deleteCardOwnedData(ctx, card._id);
    await ctx.db.delete(args.cardId);
    return { success: true };
  },
});

export const playgroundDeleteAllMyCards = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAdmin(ctx);
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return { deleted: 0 };
    const cards = await ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    let deleted = 0;
    for (const card of cards) {
      const storedImages = [...card.imageIds, ...(card.thumbnailImageIds ?? []), ...(card.backImageIds ?? []), ...(card.backThumbnailImageIds ?? [])];
      for (const id of storedImages) await ctx.storage.delete(id);
      await deleteCardOwnedData(ctx, card._id);
      await ctx.db.delete(card._id);
      deleted++;
    }
    return { deleted };
  },
});

export const playgroundSendDigestTest = action({
  args: { to: v.string() },
  handler: async (ctx, args) => {
    const access = await ctx.runQuery(api.admin.getAccess, {});
    if (!access.isAdmin) throw new Error("Administrator access is required.");
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0ede6;margin:0;padding:24px;"><div style="max-width:500px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);"><div style="background:#1a1a18;padding:22px 32px;text-align:center;"><p style="color:#f5f1e8;font-size:22px;font-weight:800;letter-spacing:.15em;margin:0;">WALL</p><p style="color:#888;font-size:11px;letter-spacing:.1em;margin:4px 0 0;">LOCAL ADS, STUCK HERE</p></div><div style="padding:32px 24px 28px;"><p style="margin:0 0 4px;font-size:11px;color:#e67e22;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">&#9888; Test digest from admin</p><h2 style="margin:0 0 6px;font-size:20px;color:#1a1a18;">New listings this week</h2><p style="color:#666;margin:0 0 24px;font-size:14px;line-height:1.6;">Here are the latest cards posted in <strong>Your City, US</strong>. This is a test digest to verify the email pipeline.</p><div style="background:#f5f1e8;border-radius:8px;padding:16px 18px;margin-bottom:12px;"><strong style="font-size:14px;color:#1a1a18;">Sample Plumber Co.</strong><p style="margin:4px 0 0;font-size:12px;color:#666;">Services &middot; Downtown</p></div><div style="background:#f5f1e8;border-radius:8px;padding:16px 18px;margin-bottom:24px;"><strong style="font-size:14px;color:#1a1a18;">Cats &amp; Dogs Grooming</strong><p style="margin:4px 0 0;font-size:12px;color:#666;">Pets &middot; Midtown</p></div><a href="${appUrl}/us" style="display:block;text-align:center;background:#f43d38;color:#fff;padding:14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">View all listings</a><p style="margin:28px 0 0;font-size:11px;color:#bbb;text-align:center;"><a href="${appUrl}/unsubscribe?token=test" style="color:#bbb;">Unsubscribe</a></p></div></div></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [args.to], subject: "TEST DIGEST — New listings on WALL", html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend error: ${res.status} ${body}`);
    }
    return { ok: true };
  },
});
