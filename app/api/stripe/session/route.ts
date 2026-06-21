import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ success: false, error: "Sign in to verify checkout." }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ success: false, error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local and restart the server." }, { status: 503 });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return new Response(JSON.stringify({ success: false, error: "Missing session_id." }), { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not complete." }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, session: { id: session.id, paymentStatus: session.payment_status, metadata: session.metadata } }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retrieve Stripe session.";
    console.error("Stripe session verification error", error);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
