import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const packageDurations: Record<number, number> = {
  2.99: 30 * 24 * 60 * 60 * 1000,
  7.99: 90 * 24 * 60 * 60 * 1000,
  19.99: 90 * 24 * 60 * 60 * 1000,
  24.99: 365 * 24 * 60 * 60 * 1000,
};

export const completePaidCard = internalMutation({
  args: {
    pendingCardId: v.id("pendingCards"),
    sessionId: v.string(),
    paidAmount: v.number(),
    tokenIdentifier: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    autoRenew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingReceipt = await ctx.db.query("paymentReceipts").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existingReceipt) {
      const existingCard = await ctx.db.get(existingReceipt.cardId);
      if (!existingCard) throw new Error("The completed card could not be found.");
      const owner = await ctx.db.get(existingCard.ownerId);
      const [existingUrls, existingThumbnailUrls, existingBackUrls, existingBackThumbnailUrls] = await Promise.all([
        Promise.all(existingCard.imageIds.map((imageId) => ctx.storage.getUrl(imageId))),
        Promise.all((existingCard.thumbnailImageIds ?? []).map((imageId) => ctx.storage.getUrl(imageId))),
        Promise.all((existingCard.backImageIds ?? []).map((imageId) => ctx.storage.getUrl(imageId))),
        Promise.all((existingCard.backThumbnailImageIds ?? []).map((imageId) => ctx.storage.getUrl(imageId))),
      ]);
      return { id: existingCard._id, ...existingCard, images: existingUrls.filter((url): url is string => url !== null), thumbnailImages: existingThumbnailUrls.filter((url): url is string => url !== null), backImages: existingBackUrls.filter((url): url is string => url !== null), backThumbnailImages: existingBackThumbnailUrls.filter((url): url is string => url !== null), verified: owner?.verified ?? false };
    }
    const pending = await ctx.db.get(args.pendingCardId);
    if (!pending || pending.status !== "pending" || pending.expiresAt <= Date.now()) throw new Error("This pending card is no longer available.");
    const owner = await ctx.db.get(pending.ownerId);
    if (!owner || owner.tokenIdentifier !== args.tokenIdentifier) throw new Error("You can only complete your own card.");
    if (owner.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    if (pending.paidAmount !== args.paidAmount) throw new Error("The verified payment does not match this card.");
    const payload = pending.payload;
    const basePaidAmount = typeof payload.basePaidAmount === "number" ? payload.basePaidAmount : args.paidAmount;
    if (!packageDurations[basePaidAmount]) throw new Error("The payment amount is invalid.");
    const featuredTier = payload.featuredTier as "boost" | "bronze" | "silver" | "gold" | undefined;
    const createdAt = Date.now();
    const cardId = await ctx.db.insert("cards", {
      ownerId: pending.ownerId,
      name: payload.name,
      category: payload.category,
      subcategory: payload.subcategory,
      line: payload.line,
      message: payload.message,
      area: payload.area,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      zipcode: payload.zipcode,
      neighborhood: payload.neighborhood,
      username: owner.username ?? undefined,
      ownerName: owner.businessName || owner.username || undefined,
      price: payload.price,
      phone: payload.phone,
      email: payload.email,
      website: payload.website,
      location: payload.location,
      instagram: payload.instagram,
      facebook: payload.facebook,
      tiktok: payload.tiktok,
      linkedin: payload.linkedin,
      whatsapp: payload.whatsapp,
      telegram: payload.telegram,
      theme: payload.theme,
      imageMode: payload.imageMode,
      cardShape: payload.cardShape,
      imageX: payload.imageX,
      imageY: payload.imageY,
      imageWidth: payload.imageWidth,
      imageHeight: payload.imageHeight,
      backImageX: payload.backImageX,
      backImageY: payload.backImageY,
      backImageScale: payload.backImageScale,
      imageIds: payload.imageIds,
      thumbnailImageIds: payload.thumbnailImageIds,
      backImageIds: payload.backImageIds,
      backThumbnailImageIds: payload.backThumbnailImageIds,
      x: payload.x,
      y: payload.y,
      rotation: payload.rotation ?? 0,
      width: payload.width,
      zIndex: createdAt,
      status: "published",
      paidAmount: basePaidAmount,
      featuredTier,
      reviewCount: 0,
      expiresAt: createdAt + packageDurations[basePaidAmount],
      positionLockedAt: createdAt,
      updatedAt: createdAt,
      createdAt,
      clicks: 0,
      autoRenew: args.autoRenew,
      stripeSubscriptionId: args.stripeSubscriptionId,
    });
    await ctx.db.insert("cardStats", { cardId, clicks: 0, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, updatedAt: createdAt });
    await ctx.db.insert("paymentReceipts", { sessionId: args.sessionId, pendingCardId: pending._id, cardId, paidAmount: args.paidAmount, usedAt: createdAt });
    await ctx.db.patch(pending._id, { status: "completed" });
    if (args.stripeCustomerId) await ctx.db.patch(owner._id, { stripeCustomerId: args.stripeCustomerId });
    const imageIds = payload.imageIds as Id<"_storage">[];
    const thumbnailImageIds = (payload.thumbnailImageIds ?? []) as Id<"_storage">[];
    const backImageIds = (payload.backImageIds ?? []) as Id<"_storage">[];
    const backThumbnailImageIds = (payload.backThumbnailImageIds ?? []) as Id<"_storage">[];
    const [urls, thumbnailUrls, backUrls, backThumbnailUrls] = await Promise.all([
      Promise.all(imageIds.map((imageId) => ctx.storage.getUrl(imageId))),
      Promise.all(thumbnailImageIds.map((imageId) => ctx.storage.getUrl(imageId))),
      Promise.all(backImageIds.map((imageId) => ctx.storage.getUrl(imageId))),
      Promise.all(backThumbnailImageIds.map((imageId) => ctx.storage.getUrl(imageId))),
    ]);
    return { id: cardId, ...payload, rotation: payload.rotation ?? 0, ownerId: pending.ownerId, username: owner.username ?? undefined, ownerName: owner.businessName || owner.username || undefined, images: urls.filter((url): url is string => url !== null), thumbnailImages: thumbnailUrls.filter((url): url is string => url !== null), backImages: backUrls.filter((url): url is string => url !== null), backThumbnailImages: backThumbnailUrls.filter((url): url is string => url !== null), zIndex: createdAt, status: "published" as const, paidAmount: basePaidAmount, featuredTier, reviewCount: 0, expiresAt: createdAt + packageDurations[basePaidAmount], positionLockedAt: createdAt, updatedAt: createdAt, createdAt, clicks: 0, verified: owner.verified ?? false };
  },
});

export const completePaidRenewal = internalMutation({
  args: {
    cardId: v.id("cards"),
    sessionId: v.string(),
    paidAmount: v.number(),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existingReceipt = await ctx.db.query("renewalReceipts").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existingReceipt) {
      if (existingReceipt.cardId !== args.cardId) throw new Error("This payment has already been used.");
      const existingCard = await ctx.db.get(args.cardId);
      if (!existingCard) throw new Error("The renewed card could not be found.");
      return { success: true, status: existingCard.status, expiresAt: existingCard.expiresAt };
    }

    const owner = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique();
    const card = await ctx.db.get(args.cardId);
    if (!owner || !card || card.ownerId !== owner._id) throw new Error("You can only renew your own cards.");
    if (owner.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    const duration = packageDurations[args.paidAmount];
    if (!duration) throw new Error("The verified payment amount is invalid.");

    const now = Date.now();
    const status = card.status === "hidden" ? "hidden" as const : "published" as const;
    const expiresAt = Math.max(now, card.expiresAt) + duration;
    await ctx.db.patch(card._id, { status, paidAmount: args.paidAmount, expiresAt, updatedAt: now });
    await ctx.db.insert("renewalReceipts", { sessionId: args.sessionId, cardId: card._id, paidAmount: args.paidAmount, usedAt: now });
    return { success: true, status, expiresAt };
  },
});

export const completeSubscriptionRenewal = internalMutation({
  args: {
    cardId: v.id("cards"),
    sessionId: v.string(),
    paidAmount: v.number(),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("renewalReceipts").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existing) {
      if (existing.cardId !== args.cardId) throw new Error("This payment has already been used.");
      const card = await ctx.db.get(args.cardId);
      if (!card) throw new Error("The renewed card could not be found.");
      return { success: true, status: card.status, expiresAt: card.expiresAt };
    }
    const owner = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique();
    const card = await ctx.db.get(args.cardId);
    if (!owner || !card || card.ownerId !== owner._id) throw new Error("You can only renew your own cards.");
    if (owner.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    const duration = packageDurations[args.paidAmount];
    if (!duration) throw new Error("The verified payment amount is invalid.");
    const now = Date.now();
    const status = card.status === "hidden" ? "hidden" as const : "published" as const;
    const expiresAt = Math.max(now, card.expiresAt) + duration;
    await ctx.db.patch(card._id, { status, paidAmount: args.paidAmount, expiresAt, updatedAt: now, autoRenew: true, stripeSubscriptionId: args.stripeSubscriptionId });
    await ctx.db.patch(owner._id, { stripeCustomerId: args.stripeCustomerId });
    await ctx.db.insert("renewalReceipts", { sessionId: args.sessionId, cardId: card._id, paidAmount: args.paidAmount, usedAt: now });
    return { success: true, status, expiresAt };
  },
});

export const processAutoRenewal = internalMutation({
  args: {
    subscriptionId: v.string(),
    paidAmount: v.number(),
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("renewalReceipts").withIndex("by_session", (q) => q.eq("sessionId", args.invoiceId)).unique();
    if (existing) return;
    const card = await ctx.db.query("cards").filter((q) => q.eq(q.field("stripeSubscriptionId"), args.subscriptionId)).first();
    if (!card) return;
    const duration = packageDurations[args.paidAmount];
    if (!duration) return;
    const now = Date.now();
    const status = card.status === "hidden" ? "hidden" as const : "published" as const;
    const expiresAt = Math.max(now, card.expiresAt) + duration;
    await ctx.db.patch(card._id, { status, expiresAt, updatedAt: now });
    await ctx.db.insert("renewalReceipts", { sessionId: args.invoiceId, cardId: card._id, paidAmount: args.paidAmount, usedAt: now });
  },
});

export const clearAutoRenew = internalMutation({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    const card = await ctx.db.query("cards").filter((q) => q.eq(q.field("stripeSubscriptionId"), args.subscriptionId)).first();
    if (!card) return;
    await ctx.db.patch(card._id, { autoRenew: false, stripeSubscriptionId: undefined });
  },
});

export const cancelAutoRenewOnCard = internalMutation({
  args: { cardId: v.id("cards"), tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique();
    const card = await ctx.db.get(args.cardId);
    if (!owner || !card || card.ownerId !== owner._id) throw new Error("You can only manage your own cards.");
    const subscriptionId = card.stripeSubscriptionId;
    await ctx.db.patch(card._id, { autoRenew: false, stripeSubscriptionId: undefined });
    return { subscriptionId };
  },
});

export const completeBundlePosting = internalMutation({
  args: {
    pendingCardId: v.id("pendingCards"),
    sessionId: v.string(),
    paidAmount: v.number(),
    tokenIdentifier: v.string(),
    bundleCities: v.array(v.object({ country: v.string(), state: v.string(), city: v.string() })),
  },
  handler: async (ctx, args) => {
    const existingReceipt = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existingReceipt) {
      const card = await ctx.db.get(existingReceipt.cardId);
      if (!card) throw new Error("Bundle card not found.");
      const owner = await ctx.db.get(card.ownerId);
      const [urls, thumbnailUrls, backUrls, backThumbnailUrls] = await Promise.all([
        Promise.all(card.imageIds.map((id) => ctx.storage.getUrl(id))),
        Promise.all((card.thumbnailImageIds ?? []).map((id) => ctx.storage.getUrl(id))),
        Promise.all((card.backImageIds ?? []).map((id) => ctx.storage.getUrl(id))),
        Promise.all((card.backThumbnailImageIds ?? []).map((id) => ctx.storage.getUrl(id))),
      ]);
      return [{ id: card._id, ...card, images: urls.filter((u): u is string => u !== null), thumbnailImages: thumbnailUrls.filter((u): u is string => u !== null), backImages: backUrls.filter((u): u is string => u !== null), backThumbnailImages: backThumbnailUrls.filter((u): u is string => u !== null), verified: owner?.verified ?? false }];
    }

    const pending = await ctx.db.get(args.pendingCardId);
    if (!pending || pending.status !== "pending" || pending.expiresAt <= Date.now()) {
      throw new Error("This pending card is no longer available.");
    }
    const owner = await ctx.db.get(pending.ownerId);
    if (!owner || owner.tokenIdentifier !== args.tokenIdentifier) throw new Error("You can only complete your own card.");
    if (owner.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    if (pending.paidAmount !== args.paidAmount) throw new Error("The verified payment does not match this card.");

    const duration = packageDurations[19.99];
    const payload = pending.payload;
    const featuredTier = payload.featuredTier as "boost" | "bronze" | "silver" | "gold" | undefined;
    const imageIds = payload.imageIds as Id<"_storage">[];
    const thumbnailImageIds = (payload.thumbnailImageIds ?? []) as Id<"_storage">[];
    const backImageIds = (payload.backImageIds ?? []) as Id<"_storage">[];
    const backThumbnailImageIds = (payload.backThumbnailImageIds ?? []) as Id<"_storage">[];
    const [urls, thumbUrls, backUrls, backThumbUrls] = await Promise.all([
      Promise.all(imageIds.map((id) => ctx.storage.getUrl(id))),
      Promise.all(thumbnailImageIds.map((id) => ctx.storage.getUrl(id))),
      Promise.all(backImageIds.map((id) => ctx.storage.getUrl(id))),
      Promise.all(backThumbnailImageIds.map((id) => ctx.storage.getUrl(id))),
    ]);
    const images = urls.filter((u): u is string => u !== null);
    const thumbnailImages = thumbUrls.filter((u): u is string => u !== null);
    const backImages = backUrls.filter((u): u is string => u !== null);
    const backThumbnailImages = backThumbUrls.filter((u): u is string => u !== null);

    const cities = args.bundleCities.slice(0, 3);
    const createdCards: Array<{ id: Id<"cards"> }> = [];

    for (const loc of cities) {
      const createdAt = Date.now();
      const cardId = await ctx.db.insert("cards", {
        ownerId: pending.ownerId,
        name: payload.name,
        category: payload.category,
        subcategory: payload.subcategory,
        line: payload.line,
        message: payload.message,
        area: payload.area,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        zipcode: payload.zipcode,
        neighborhood: payload.neighborhood,
        username: owner.username ?? undefined,
        ownerName: owner.businessName || owner.username || undefined,
        price: payload.price,
        phone: payload.phone,
        email: payload.email,
        website: payload.website,
        location: payload.location,
        instagram: payload.instagram,
        facebook: payload.facebook,
        tiktok: payload.tiktok,
        linkedin: payload.linkedin,
        whatsapp: payload.whatsapp,
        telegram: payload.telegram,
        theme: payload.theme,
        imageMode: payload.imageMode,
        imageX: payload.imageX,
        imageY: payload.imageY,
        imageWidth: payload.imageWidth,
        imageHeight: payload.imageHeight,
        backImageX: payload.backImageX,
        backImageY: payload.backImageY,
        backImageScale: payload.backImageScale,
        imageIds,
        thumbnailImageIds,
        backImageIds,
        backThumbnailImageIds,
        x: payload.x,
        y: payload.y,
        rotation: payload.rotation ?? 0,
        width: payload.width,
        zIndex: createdAt,
        status: "published",
        paidAmount: 19.99,
        featuredTier,
        reviewCount: 0,
        expiresAt: createdAt + duration,
        positionLockedAt: createdAt,
        updatedAt: createdAt,
        createdAt,
        clicks: 0,
      });
      await ctx.db.insert("cardStats", { cardId, clicks: 0, websiteClicks: 0, phoneClicks: 0, emailClicks: 0, socialClicks: 0, saves: 0, shares: 0, updatedAt: Date.now() });
      createdCards.push({ id: cardId });
    }

    await ctx.db.insert("paymentReceipts", {
      sessionId: args.sessionId,
      pendingCardId: pending._id,
      cardId: createdCards[0].id,
      paidAmount: args.paidAmount,
      usedAt: Date.now(),
    });
    await ctx.db.patch(pending._id, { status: "completed" });

      return createdCards.map(({ id }) => ({
      id,
      ...payload,
      images,
      thumbnailImages,
      backImages,
      backThumbnailImages,
      status: "published" as const,
      paidAmount: 19.99,
      featuredTier,
      reviewCount: 0,
      clicks: 0,
      zIndex: Date.now(),
      verified: owner.verified ?? false,
    }));
  },
});

export const handleStripeWebhook = internalAction({
  args: { sig: v.string(), body: v.string() },
  handler: async (ctx, args): Promise<void> => {
    // Dynamic import keeps "use node" scoped to this action only
    const Stripe = (await import("stripe")).default;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !webhookSecret) throw new Error("Stripe not configured.");
    const stripe = new Stripe(stripeKey);
    let event: import("stripe").Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(args.body, args.sig, webhookSecret);
    } catch {
      throw new Error("Invalid webhook signature");
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as unknown as Record<string, unknown>;
      if (invoice["billing_reason"] === "subscription_create") return;
      const sub = invoice["subscription"];
      const subscriptionId = typeof sub === "string" ? sub : (sub as { id: string } | null)?.id;
      if (!subscriptionId) return;
      const paidAmount = (invoice["amount_paid"] as number) / 100;
      const invoiceId = invoice["id"] as string;
      await ctx.runMutation(internal.paymentsInternal.processAutoRenewal, { subscriptionId, paidAmount, invoiceId });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as import("stripe").Stripe.Subscription;
      await ctx.runMutation(internal.paymentsInternal.clearAutoRenew, { subscriptionId: subscription.id });
    }
  },
});

export const completeVerificationRequest = internalMutation({
  args: {
    sessionId: v.string(),
    paidAmount: v.number(),
    plan: v.union(v.literal("monthly"), v.literal("annual")),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("verificationRequests").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existing) return { requestId: existing._id, status: existing.status };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique();
    if (!user) throw new Error("Your WALL profile could not be found.");
    if (user.blockedAt) throw new Error("Your account is blocked by WALL admin. Contact support for help.");
    const requestId = await ctx.db.insert("verificationRequests", {
      userId: user._id,
      status: "pending",
      plan: args.plan,
      paidAmount: args.paidAmount,
      sessionId: args.sessionId,
      createdAt: Date.now(),
    });
    return { requestId, status: "pending" as const };
  },
});
