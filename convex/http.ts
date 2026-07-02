import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { internal } from "./_generated/api";
import { env } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const sig = request.headers.get("stripe-signature");
    const body = await request.text();
    if (!sig) return new Response("Missing stripe-signature header", { status: 400 });
    try {
      await ctx.runAction(internal.paymentsInternal.handleStripeWebhook, { sig, body });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook error";
      return new Response(message, { status: 400 });
    }
    return new Response("OK");
  }),
});

http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
      return new Response("Missing CLERK_WEBHOOK_SIGNING_SECRET", { status: 503 });
    }

    try {
      const evt = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET });
      if (evt.type === "user.created" || evt.type === "user.updated") {
        const primaryEmailId = evt.data.primary_email_address_id ?? null;
        const primaryEmail = primaryEmailId
          ? evt.data.email_addresses?.find((address) => address.id === primaryEmailId)?.email_address
          : evt.data.email_addresses?.[0]?.email_address;
        const displayName = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ").trim() || evt.data.username || primaryEmail || null;

        await ctx.runMutation(internal.users.upsertFromClerkWebhook, {
          externalUserId: evt.data.id,
          tokenIdentifier: evt.data.id,
          displayName: displayName || undefined,
          email: primaryEmail ?? undefined,
          avatarUrl: evt.data.image_url ?? undefined,
        });
      } else if (evt.type === "user.deleted") {
        const clerkUserId = evt.data.id;
        if (!clerkUserId) return new Response("Missing Clerk user id", { status: 400 });
        await ctx.runMutation(internal.users.deleteFromClerkWebhook, {
          clerkUserId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook error";
      return new Response(message, { status: 400 });
    }

    return new Response("OK");
  }),
});

export default http;
