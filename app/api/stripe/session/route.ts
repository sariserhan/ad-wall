import Stripe from "stripe";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2022-11-15" });

export async function GET(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ success: false, error: "Stripe secret key is not configured." }), { status: 500 });
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

    return new Response(JSON.stringify({ success: true, session: { id: session.id, paymentStatus: session.payment_status } }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "Unable to retrieve Stripe session." }), { status: 500 });
  }
}
