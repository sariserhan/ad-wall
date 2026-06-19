import Stripe from "stripe";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2022-11-15" });

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Stripe secret key is not configured." }), { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const cardPayload = body?.cardPayload;
  if (!cardPayload) {
    return new Response(JSON.stringify({ error: "Missing card payload." }), { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const successUrl = `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Wall card posting",
            description: "Secure your wall card placement",
          },
          unit_amount: Math.max(100, Math.round(Number(cardPayload.paidAmount) * 100)),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
    headers: { "Content-Type": "application/json" },
  });
}
