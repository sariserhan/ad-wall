import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "../../_rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

const paidAmounts = new Set([1, 3, 10, 20]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "checkout", 20, 60 * 60 * 1000);
  if (limited) return limited;
  if (!process.env.STRIPE_SECRET_KEY) {
    return json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local and restart the server." }, 503);
  }
  const { userId } = await auth();
  if (!userId) return json({ error: "Sign in before starting checkout." }, 401);

  try {
    const body = await request.json().catch(() => null);
    const renewalPayload = body?.renewalPayload;
    if (renewalPayload) {
      const paidAmount = Number(renewalPayload.paidAmount);
      if (!paidAmounts.has(paidAmount) || typeof renewalPayload.cardId !== "string") {
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
            unit_amount: paidAmount * 100,
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
    if (typeof pendingCardId !== "string" || !paidAmounts.has(paidAmount)) {
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
          unit_amount: paidAmount * 100,
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
    console.error("Stripe checkout error", cause);
    return json({ error: message }, 500);
  }
}
