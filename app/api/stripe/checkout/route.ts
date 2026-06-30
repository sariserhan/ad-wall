import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { durableUserRateLimit } from "../../_distributed-rate-limit";
import { isSameOriginRequest, rateLimit } from "../../_rate-limit";
import { log } from "@/lib/logger";
import { observe } from "../../_observe";
import { getPostHogClient } from "@/lib/posthog-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// Validate using integer cents to avoid floating-point matching issues.
// Valid base durations: free (0), $2.99, $7.99, $24.99; bundle: $19.99
// Valid featured add-ons: none (0), Boost $2.99, legacy Bronze $2.99, Silver $4.99, Gold $9.99
const validBaseCents = [0, 299, 799, 2499];
const validFeaturedCents = [0, 299, 499, 999];
const validAmountCents = new Set<number>();
for (const base of validBaseCents) {
  for (const feat of validFeaturedCents) {
    if (base + feat > 0) validAmountCents.add(base + feat);
  }
}
validAmountCents.add(1999); // multi-city bundle
function isValidAmount(amount: number) {
  return validAmountCents.has(Math.round(amount * 100));
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function handleCheckout(request: NextRequest): Promise<Response> {
  if (!isSameOriginRequest(request)) return json({ error: "Cross-site checkout requests are not allowed." }, 403);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8 * 1024) return json({ error: "Checkout request is too large." }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Checkout requests must use JSON." }, 415);
  const ipLimit = rateLimit(request, "checkout:ip:hour", 40, 60 * 60 * 1000);
  if (ipLimit) return ipLimit;
  if (!process.env.STRIPE_SECRET_KEY) {
    return json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local and restart the server." }, 503);
  }
  const { userId, getToken } = await auth();
  if (!userId) return json({ error: "Sign in before starting checkout." }, 401);
  const durableLimit = await durableUserRateLimit(await getToken({ template: "convex" }), ["checkout_hour", "checkout_day"]);
  if (durableLimit) return durableLimit;

  try {
    const body = await request.json().catch(() => null);

    const verificationPayload = body?.verificationPayload;
    if (verificationPayload) {
      const plan = verificationPayload.plan;
      if (plan !== "monthly" && plan !== "annual") return json({ error: "Invalid verification plan." }, 400);
      const unitAmount = plan === "monthly" ? 499 : 1999;
      const origin = new URL(request.url).origin;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: plan === "monthly" ? "Verified Business Badge — Monthly" : "Verified Business Badge — Annual",
              description: "Verified checkmark on all your WALL cards",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }],
        metadata: { kind: "verification", plan, paidAmount: String(unitAmount / 100) },
        success_url: `${origin}/?checkout=success&kind=verification&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
      });
      const phVerif = getPostHogClient();
      phVerif.capture({ distinctId: userId, event: "checkout_started", properties: { kind: "verification", plan, amount: unitAmount / 100 } });
      await phVerif.shutdown();
      return json({ url: session.url, sessionId: session.id });
    }

    const renewalPayload = body?.renewalPayload;
    if (renewalPayload) {
      const paidAmount = Number(renewalPayload.paidAmount);
      if (!isValidAmount(paidAmount) || typeof renewalPayload.cardId !== "string") {
        return json({ error: "Invalid renewal request." }, 400);
      }

      const origin = new URL(request.url).origin;
      const cardName = String(renewalPayload.cardName || "wall card").slice(0, 80);

      if (renewalPayload.autoRenew) {
        const interval: "month" | "year" = paidAmount === 24.99 ? "year" : "month";
        const intervalCount = paidAmount === 7.99 ? 3 : 1;
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{
            price_data: {
              currency: "usd",
              recurring: { interval, interval_count: intervalCount },
              product_data: {
                name: `${cardName} — Auto-renew`,
                description: "Automatically renews your listing on the wall",
              },
              unit_amount: Math.round(paidAmount * 100),
            },
            quantity: 1,
          }],
          metadata: {
            kind: "subscription_renewal",
            cardId: renewalPayload.cardId,
            paidAmount: String(paidAmount),
          },
          subscription_data: {
            metadata: {
              cardId: renewalPayload.cardId,
              paidAmount: String(paidAmount),
            },
          },
          success_url: `${origin}/?checkout=success&kind=subscription_renewal&card_id=${encodeURIComponent(renewalPayload.cardId)}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
        });
        const phSubRenewal = getPostHogClient();
        phSubRenewal.capture({ distinctId: userId, event: "checkout_started", properties: { kind: "subscription_renewal", amount: paidAmount } });
        await phSubRenewal.shutdown();
        return json({ url: session.url, sessionId: session.id });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Renew ${cardName}`,
              description: "Extend this card's time on the wall",
            },
            unit_amount: Math.round(paidAmount * 100),
          },
          quantity: 1,
        }],
        metadata: {
          kind: "renewal",
          cardId: renewalPayload.cardId,
          paidAmount: String(paidAmount),
        },
        success_url: `${origin}/?checkout=success&kind=renewal&card_id=${encodeURIComponent(renewalPayload.cardId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
      });

      const phRenewal = getPostHogClient();
      phRenewal.capture({ distinctId: userId, event: "checkout_started", properties: { kind: "renewal", amount: paidAmount } });
      await phRenewal.shutdown();
      return json({ url: session.url, sessionId: session.id });
    }

    const bundlePayload = body?.bundlePayload;
    if (bundlePayload) {
      if (typeof bundlePayload.pendingCardId !== "string") return json({ error: "Invalid bundle request." }, 400);
      const cities = Array.isArray(bundlePayload.bundleCities) ? bundlePayload.bundleCities : [];
      if (cities.length < 2 || cities.length > 3) return json({ error: "Bundle requires 2–3 cities." }, 400);
      for (const city of cities) {
        if (typeof city.country !== "string" || !city.country.trim()) {
          return json({ error: "Each bundle slot must have a country selected." }, 400);
        }
      }
      const origin = new URL(request.url).origin;
      const cardName = String(bundlePayload.cardName || "wall card").slice(0, 80);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `${cardName} — Multi-City Bundle`,
              description: `Post in ${cities.length} cities for 90 days`,
            },
            unit_amount: 1999,
          },
          quantity: 1,
        }],
        metadata: {
          kind: "bundle",
          pendingCardId: bundlePayload.pendingCardId,
          bundleCities: JSON.stringify(cities),
          paidAmount: "19.99",
        },
        success_url: `${origin}/?checkout=success&kind=bundle&pending_card_id=${encodeURIComponent(bundlePayload.pendingCardId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
      });
      const phBundle = getPostHogClient();
      phBundle.capture({ distinctId: userId, event: "checkout_started", properties: { kind: "bundle", amount: 19.99, city_count: cities.length } });
      await phBundle.shutdown();
      return json({ url: session.url, sessionId: session.id });
    }

    const pendingCardId = body?.pendingCardId;
    const paidAmount = Number(body?.paidAmount);
    if (typeof pendingCardId !== "string" || !isValidAmount(paidAmount)) {
      return json({ error: "Invalid paid card request." }, 400);
    }

    const origin = new URL(request.url).origin;
    const cardName = `Post ${String(body?.cardName || "wall card").slice(0, 80)}`;

    if (body?.autoRenew && paidAmount > 0) {
      const interval: "month" | "year" = paidAmount === 24.99 ? "year" : "month";
      const intervalCount = paidAmount === 7.99 ? 3 : 1;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "usd",
            recurring: { interval, interval_count: intervalCount },
            product_data: {
              name: `${cardName} — Auto-renew`,
              description: "Your card stays on the wall and renews automatically",
            },
            unit_amount: Math.round(paidAmount * 100),
          },
          quantity: 1,
        }],
        metadata: {
          kind: "subscription_posting",
          pendingCardId,
          paidAmount: String(paidAmount),
        },
        subscription_data: {
          metadata: { pendingCardId, paidAmount: String(paidAmount) },
        },
        success_url: `${origin}/?checkout=success&kind=subscription_posting&pending_card_id=${encodeURIComponent(pendingCardId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
      });
      const phSubPosting = getPostHogClient();
      phSubPosting.capture({ distinctId: userId, event: "checkout_started", properties: { kind: "subscription_posting", amount: paidAmount } });
      await phSubPosting.shutdown();
      return json({ url: session.url, sessionId: session.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: cardName,
            description: "Publish this card on the local wall",
          },
          unit_amount: Math.round(paidAmount * 100),
        },
        quantity: 1,
      }],
      metadata: {
        kind: "posting",
        pendingCardId,
        paidAmount: String(paidAmount),
      },
      success_url: `${origin}/?checkout=success&kind=posting&pending_card_id=${encodeURIComponent(pendingCardId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
    });

    const phPosting = getPostHogClient();
    phPosting.capture({ distinctId: userId, event: "checkout_started", properties: { kind: "posting", amount: paidAmount } });
    await phPosting.shutdown();
    return json({ url: session.url, sessionId: session.id });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Stripe checkout could not be started.";
    log({
      event: "checkout.failure",
      level: "error",
      error: message,
      stripeCode: cause instanceof Stripe.errors.StripeError ? cause.code : undefined,
      type: cause instanceof Stripe.errors.StripeError ? cause.type : undefined,
    });
    const phFail = getPostHogClient();
    phFail.capture({ distinctId: userId ?? "anonymous", event: "checkout_failed", properties: { error: message } });
    await phFail.shutdown();
    return json({ error: message }, 500);
  }
}

export const POST = observe("/api/stripe/checkout", handleCheckout);
