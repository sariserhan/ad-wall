import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { durableUserRateLimit } from "../../_distributed-rate-limit";
import { isSameOriginRequest, rateLimit } from "../../_rate-limit";
import { log } from "@/lib/logger";
import { observe } from "../../_observe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// Validate using integer cents to avoid floating-point matching issues.
// Valid base durations: free (0), $2.99, $7.99, $24.99
// Valid featured add-ons: none (0), Bronze $2.99, Silver $4.99, Gold $9.99
const validBaseCents = [0, 299, 799, 2499];
const validFeaturedCents = [0, 299, 499, 999];
const validAmountCents = new Set<number>();
for (const base of validBaseCents) {
  for (const feat of validFeaturedCents) {
    if (base + feat > 0) validAmountCents.add(base + feat);
  }
}
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
    const renewalPayload = body?.renewalPayload;
    if (renewalPayload) {
      const paidAmount = Number(renewalPayload.paidAmount);
      if (!isValidAmount(paidAmount) || typeof renewalPayload.cardId !== "string") {
        return json({ error: "Invalid renewal request." }, 400);
      }

      const origin = new URL(request.url).origin;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Renew ${String(renewalPayload.cardName || "wall card").slice(0, 80)}`,
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

      return json({ url: session.url, sessionId: session.id });
    }

    const pendingCardId = body?.pendingCardId;
    const paidAmount = Number(body?.paidAmount);
    if (typeof pendingCardId !== "string" || !isValidAmount(paidAmount)) {
      return json({ error: "Invalid paid card request." }, 400);
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
          name: `Post ${String(body?.cardName || "wall card").slice(0, 80)}`,
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
    return json({ error: message }, 500);
  }
}

export const POST = observe("/api/stripe/checkout", handleCheckout);
