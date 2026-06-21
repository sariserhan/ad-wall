"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, env } from "./_generated/server";

export const finalizePaidCard = action({
  args: { sessionId: v.string(), pendingCardId: v.id("pendingCards") },
  handler: async (ctx, args): Promise<unknown> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must sign in to finish publishing.");
    if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured in Convex.");
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(args.sessionId);
    if (session.payment_status !== "paid") throw new Error("Payment is not complete.");
    if (session.metadata?.pendingCardId !== String(args.pendingCardId)) throw new Error("Payment does not match this pending card.");
    const paidAmount = (session.amount_total ?? 0) / 100;
    return await ctx.runMutation(internal.paymentsInternal.completePaidCard, {
      pendingCardId: args.pendingCardId,
      sessionId: session.id,
      paidAmount,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const finalizePaidRenewal = action({
  args: { sessionId: v.string(), cardId: v.id("cards") },
  handler: async (ctx, args): Promise<unknown> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must sign in to finish renewing.");
    if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured in Convex.");
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(args.sessionId);
    if (session.payment_status !== "paid") throw new Error("Payment is not complete.");
    if (session.metadata?.kind !== "renewal" || session.metadata.cardId !== String(args.cardId)) throw new Error("Payment does not match this renewal.");
    const paidAmount = (session.amount_total ?? 0) / 100;
    return await ctx.runMutation(internal.paymentsInternal.completePaidRenewal, {
      cardId: args.cardId,
      sessionId: session.id,
      paidAmount,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});
