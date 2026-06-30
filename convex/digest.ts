import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const subscribe = mutation({
  args: {
    email: v.string(),
    country: v.string(),
    state: v.string(),
    city: v.string(),
  },
  handler: async (ctx, args) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) throw new Error("Invalid email address.");
    if (!args.country.trim()) throw new Error("Country is required to subscribe.");
    const normalized = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("digestSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .filter((q) =>
        q.and(
          q.eq(q.field("country"), args.country),
          q.eq(q.field("state"), args.state),
          q.eq(q.field("city"), args.city),
        ),
      )
      .first();
    if (existing) return { alreadySubscribed: true };
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("digestSubscriptions", {
      email: normalized,
      country: args.country,
      state: args.state,
      city: args.city,
      unsubscribeToken,
      createdAt: Date.now(),
    });
    return { alreadySubscribed: false };
  },
});

export const unsubscribeByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("digestSubscriptions")
      .withIndex("by_token", (q) => q.eq("unsubscribeToken", args.token))
      .unique();
    if (!sub) return { success: false };
    await ctx.db.delete(sub._id);
    return { success: true };
  },
});

export const markDigestSent = internalMutation({
  args: { subscriptionId: v.id("digestSubscriptions"), sentAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, { lastSentAt: args.sentAt });
  },
});

export const findCitiesWithSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("digestSubscriptions").collect();
    const cityMap = new Map<string, {
      country: string;
      state: string;
      city: string;
      subscribers: Array<{ id: Id<"digestSubscriptions">; email: string; token: string }>;
    }>();
    for (const sub of subs) {
      const key = `${sub.country}|${sub.state}|${sub.city}`;
      if (!cityMap.has(key)) cityMap.set(key, { country: sub.country, state: sub.state, city: sub.city, subscribers: [] });
      cityMap.get(key)!.subscribers.push({ id: sub._id, email: sub.email, token: sub.unsubscribeToken });
    }
    return Array.from(cityMap.values());
  },
});

export const findNewCardsForLocation = internalQuery({
  args: { country: v.string(), state: v.string(), city: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    let cards;
    if (args.city) {
      cards = await ctx.db
        .query("cards")
        .withIndex("by_status_and_country_and_state_and_city_and_createdAt", (q) =>
          q.eq("status", "published").eq("country", args.country).eq("state", args.state).eq("city", args.city).gte("createdAt", args.since),
        )
        .order("desc")
        .take(12);
    } else if (args.state) {
      const batch = await ctx.db
        .query("cards")
        .withIndex("by_status_and_country_and_state_and_city_and_createdAt", (q) =>
          q.eq("status", "published").eq("country", args.country).eq("state", args.state),
        )
        .order("desc")
        .take(300);
      cards = batch.filter((c) => c.createdAt >= args.since).slice(0, 12);
    } else {
      const batch = await ctx.db
        .query("cards")
        .withIndex("by_status_and_country_and_state_and_city_and_createdAt", (q) =>
          q.eq("status", "published").eq("country", args.country),
        )
        .order("desc")
        .take(300);
      cards = batch.filter((c) => c.createdAt >= args.since).slice(0, 12);
    }
    return cards.map((card) => ({
      id: String(card._id),
      name: card.name,
      category: String(card.category),
      line: card.line,
      message: card.message,
      price: card.price,
      area: card.area,
      city: card.city,
      state: card.state,
      featuredTier: card.featuredTier,
    }));
  },
});

export const sendWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://localwall.co").replace(/\/$/, "");

    if (!apiKey) {
      console.warn("[digest] RESEND_API_KEY not set — skipping weekly digest.");
      return;
    }

    const locations = await ctx.runQuery(internal.digest.findCitiesWithSubscribers, {});
    const since = Date.now() - WEEK_MS;
    const now = Date.now();

    for (const group of locations) {
      const cards = await ctx.runQuery(internal.digest.findNewCardsForLocation, {
        country: group.country,
        state: group.state,
        city: group.city,
        since,
      });

      if (cards.length === 0) continue;

      const promoted = cards
        .filter((c: DigestCard) => c.featuredTier === "boost" || c.featuredTier === "gold" || c.featuredTier === "silver")
        .sort((a, b) => (a.featuredTier === "boost" ? -1 : b.featuredTier === "boost" ? 1 : 0))
        .slice(0, 2);
      const organic = cards.filter((c: DigestCard) => c.featuredTier !== "boost" && c.featuredTier !== "gold" && c.featuredTier !== "silver").slice(0, 6);

      // Build a human-readable location label and wall URL for each scope level
      const citySlug = group.city ? group.city.toLowerCase().replace(/\s+/g, "-") : "";
      const wallUrl = group.city
        ? `${appUrl}/${group.country.toLowerCase()}/${group.state.toLowerCase()}/${citySlug}`
        : group.state
          ? `${appUrl}/${group.country.toLowerCase()}/${group.state.toLowerCase()}`
          : `${appUrl}/${group.country.toLowerCase()}`;
      const locationLabel = group.city
        ? `${group.city}${group.state ? `, ${group.state}` : ""}`
        : group.state
          ? group.state
          : group.country;

      for (const sub of group.subscribers) {
        const unsubscribeUrl = `${appUrl}/unsubscribe?token=${sub.token}`;

        const html = buildDigestEmail({
          locationLabel,
          promoted,
          organic,
          wallUrl,
          unsubscribeUrl,
          appUrl,
        });

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: fromEmail,
              to: [sub.email],
              subject: `New on ${locationLabel} Wall this week — ${cards.length} listing${cards.length === 1 ? "" : "s"}`,
              html,
            }),
          });
          if (res.ok) {
            await ctx.runMutation(internal.digest.markDigestSent, { subscriptionId: sub.id, sentAt: now });
          } else {
            const body = await res.text().catch(() => "");
            console.error(`[digest] Resend error for ${sub.email}: ${res.status} ${body}`);
          }
        } catch (cause) {
          console.error(`[digest] Failed to send to ${sub.email}:`, cause);
        }
      }
    }
  },
});

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type DigestCard = { id: string; name: string; category: string; line: string; message?: string; price?: string; area: string; city?: string; state?: string; featuredTier?: string };

function buildCardRow(card: DigestCard, appUrl: string, promoted = false): string {
  const cardUrl = `${appUrl}/card/${card.id}`;
  const bg = promoted ? "#1a1a18" : "#f5f1e8";
  const accent = promoted ? "#edcf35" : "#1a1a18";
  const textColor = promoted ? "#f5f1e8" : "#1a1a18";
  const badge = promoted
    ? `<span style="display:inline-block;background:#edcf35;color:#1a1a18;font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 7px;border-radius:3px;text-transform:uppercase;margin-bottom:8px;">Promoted</span><br>`
    : "";
  return `<tr><td style="padding:5px 0;">
    <a href="${cardUrl}" style="display:block;background:${bg};color:${textColor};border-radius:8px;padding:16px 18px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      ${badge}<span style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.5;">${escapeHtml(card.category)}${card.area ? ` · ${escapeHtml(card.area)}` : ""}</span><br>
      <strong style="font-size:17px;font-weight:800;color:${accent};display:block;margin-top:3px;">${escapeHtml(card.name)}</strong>
      <span style="font-size:13px;opacity:.75;margin-top:3px;display:block;">${escapeHtml(card.line)}</span>
      ${card.price ? `<span style="font-size:12px;font-weight:700;margin-top:5px;display:block;opacity:.7;">${escapeHtml(card.price)}</span>` : ""}
    </a>
  </td></tr>`;
}

function buildDigestEmail({ locationLabel, promoted, organic, wallUrl, unsubscribeUrl, appUrl }: {
  locationLabel: string;
  promoted: DigestCard[]; organic: DigestCard[];
  wallUrl: string; unsubscribeUrl: string; appUrl: string;
}): string {
  const totalNew = promoted.length + organic.length;
  const weekStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const promotedRows = promoted.map((c) => buildCardRow(c, appUrl, true)).join("");
  const organicRows = organic.map((c) => buildCardRow(c, appUrl, false)).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0ede6;margin:0;padding:24px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
    <div style="background:#1a1a18;padding:22px 32px;">
      <p style="color:#f5f1e8;font-size:22px;font-weight:800;letter-spacing:.15em;margin:0;">WALL</p>
      <p style="color:#888;font-size:11px;letter-spacing:.1em;margin:4px 0 0;">LOCAL ADS, STUCK HERE</p>
    </div>
    <div style="padding:28px 24px 8px;">
      <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px;">${weekStr} · Weekly Digest</p>
      <h2 style="margin:0 0 4px;font-size:22px;color:#1a1a18;">New on ${escapeHtml(locationLabel)} Wall</h2>
      <p style="color:#666;margin:0 0 22px;font-size:14px;">${totalNew} new listing${totalNew === 1 ? "" : "s"} this week in ${escapeHtml(locationLabel)}.</p>
      ${promoted.length > 0 ? `<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;">Promoted</p><table style="width:100%;border-collapse:collapse;">${promotedRows}</table><p style="margin:18px 0 6px;font-size:11px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;">New this week</p>` : `<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;">New this week</p>`}
      <table style="width:100%;border-collapse:collapse;">${organicRows}</table>
      <div style="text-align:center;padding:24px 0 10px;">
        <a href="${wallUrl}" style="display:inline-block;background:#edcf35;color:#1a1a18;font-weight:800;font-size:14px;padding:13px 28px;border-radius:7px;text-decoration:none;letter-spacing:.04em;">View ${escapeHtml(locationLabel)} Wall →</a>
      </div>
    </div>
    <div style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f0ede6;">
      <p style="margin:0;font-size:11px;color:#bbb;">You're subscribed to the ${escapeHtml(locationLabel)} weekly digest.<br><a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
