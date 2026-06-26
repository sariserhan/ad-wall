import { expect, test, describe, beforeAll, afterAll } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import type { CardCategory, CardTheme } from "../../src/features/wall/types";
import { makeT, adminIdentity, adminEnv, applyEnv, seedAdminUser } from "./helpers";

let cleanupEnv: () => void;
beforeAll(() => { cleanupEnv = applyEnv(adminEnv); });
afterAll(() => cleanupEnv());

const pgCard = {
  name: "Playground Test Biz",
  category: "Services" as CardCategory,
  line: "Testing the playground feature",
  country: "xx",
  state: "test",
  city: "Playground",
  theme: "yellow" as CardTheme,
  paidAmount: 0,
};

async function createPgCard(t: ReturnType<typeof makeT>, overrides: Record<string, unknown> = {}) {
  await seedAdminUser(t);
  const result = await t.withIdentity(adminIdentity).mutation(api.admin.playgroundCreateCard, { ...pgCard, ...overrides } as any) as { cardId: Id<"cards"> };
  return result.cardId;
}

// ---------------------------------------------------------------------------
// playgroundGetMyCards
// ---------------------------------------------------------------------------

describe("playgroundGetMyCards", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    await expect(t.query(api.admin.playgroundGetMyCards, {})).rejects.toThrow("Administrator");
  });

  test("returns empty cards and verified:false for fresh admin", async () => {
    const t = makeT();
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: unknown[]; verified: boolean };
    expect(data.cards).toHaveLength(0);
    expect(data.verified).toBe(false);
  });

  test("reflects created cards", async () => {
    const t = makeT();
    await createPgCard(t);
    await createPgCard(t, { name: "Second card" });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ name: string }> };
    expect(data.cards).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// playgroundCreateCard
// ---------------------------------------------------------------------------

describe("playgroundCreateCard", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    await expect(t.mutation(api.admin.playgroundCreateCard, pgCard)).rejects.toThrow("Administrator");
  });

  test("creates a published card for the admin", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; status: string }> };
    const card = data.cards.find((c) => c.id === cardId);
    expect(card).toBeDefined();
    expect(card!.status).toBe("published");
  });

  test("pending:true creates a hidden card", async () => {
    const t = makeT();
    const cardId = await createPgCard(t, { pending: true });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; status: string }> };
    const card = data.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("hidden");
  });

  test("sets featuredTier when provided", async () => {
    const t = makeT();
    const cardId = await createPgCard(t, { featuredTier: "gold" });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; featuredTier: string | null }> };
    const card = data.cards.find((c) => c.id === cardId);
    expect(card!.featuredTier).toBe("gold");
  });

  test("free plan gives 1-day expiry", async () => {
    const t = makeT();
    const before = Date.now();
    const cardId = await createPgCard(t, { paidAmount: 0 });
    const after = Date.now();
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; expiresAt: number }> };
    const card = data.cards.find((c) => c.id === cardId);
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(card!.expiresAt).toBeGreaterThanOrEqual(before + oneDayMs);
    expect(card!.expiresAt).toBeLessThanOrEqual(after + oneDayMs + 100);
  });

  test("accepts custom duration, metrics, and owner label", async () => {
    const t = makeT();
    const cardId = await createPgCard(t, {
      ownerName: "Sunrise Dental Group",
      durationDays: 7,
      likes: 27,
      clicks: 190,
      reviewCount: 11,
      status: "hidden",
      featuredTier: "silver",
    });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; expiresAt: number; featuredTier: string | null; clicks: number; likes: number; reviewCount: number; status: string }> };
    const card = data.cards.find((c) => c.id === cardId);
    expect(card).toBeDefined();
    expect(card!.featuredTier).toBe("silver");
    expect(card!.clicks).toBe(190);
    expect(card!.likes).toBe(27);
    expect(card!.reviewCount).toBe(11);
    expect(card!.status).toBe("hidden");
    expect(card!.expiresAt - Date.now()).toBeGreaterThan(5 * 24 * 60 * 60 * 1000);
    await t.run(async (ctx) => {
      const stored = await ctx.db.get(cardId);
      expect(stored?.ownerName).toBe("Sunrise Dental Group");
    });
  });
});

// ---------------------------------------------------------------------------
// playgroundSetExpiry
// ---------------------------------------------------------------------------

describe("playgroundSetExpiry", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await expect(t.mutation(api.admin.playgroundSetExpiry, { cardId, expiresAt: Date.now() + 1000 })).rejects.toThrow("Administrator");
  });

  test("sets expiry to future marks card published", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    const future = Date.now() + 3 * 24 * 60 * 60 * 1000;
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetExpiry, { cardId, expiresAt: future });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; expiresAt: number; status: string }> };
    const card = data.cards.find((c) => c.id === cardId);
    expect(card!.expiresAt).toBe(future);
    expect(card!.status).toBe("published");
  });

  test("sets expiry to past marks card expired", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetExpiry, { cardId, expiresAt: Date.now() - 1000 });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; status: string }> };
    const card = data.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("expired");
  });
});

// ---------------------------------------------------------------------------
// playgroundSetFeaturedTier
// ---------------------------------------------------------------------------

describe("playgroundSetFeaturedTier", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await expect(t.mutation(api.admin.playgroundSetFeaturedTier, { cardId, tier: "gold" })).rejects.toThrow("Administrator");
  });

  test("sets tier to gold", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetFeaturedTier, { cardId, tier: "gold" });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; featuredTier: string | null }> };
    expect(data.cards.find((c) => c.id === cardId)!.featuredTier).toBe("gold");
  });

  test("clears tier when undefined is passed", async () => {
    const t = makeT();
    const cardId = await createPgCard(t, { featuredTier: "silver" });
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetFeaturedTier, { cardId });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; featuredTier: string | null }> };
    expect(data.cards.find((c) => c.id === cardId)!.featuredTier).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// playgroundRenewCard
// ---------------------------------------------------------------------------

describe("playgroundRenewCard", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await expect(t.mutation(api.admin.playgroundRenewCard, { cardId, paidAmount: 2.99 })).rejects.toThrow("Administrator");
  });

  test("extends expiry and republishes an expired card", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetExpiry, { cardId, expiresAt: Date.now() - 1000 });
    const result = await t.withIdentity(adminIdentity).mutation(api.admin.playgroundRenewCard, { cardId, paidAmount: 2.99 }) as { success: boolean; expiresAt: number };
    expect(result.success).toBe(true);
    expect(result.expiresAt).toBeGreaterThan(Date.now());
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards">; status: string }> };
    expect(data.cards.find((c) => c.id === cardId)!.status).toBe("published");
  });
});

// ---------------------------------------------------------------------------
// playgroundSetVerified
// ---------------------------------------------------------------------------

describe("playgroundSetVerified", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    await expect(t.mutation(api.admin.playgroundSetVerified, { verified: true })).rejects.toThrow("Administrator");
  });

  test("grants verified status", async () => {
    const t = makeT();
    await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetVerified, { verified: true });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { verified: boolean };
    expect(data.verified).toBe(true);
  });

  test("revokes verified status", async () => {
    const t = makeT();
    await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetVerified, { verified: true });
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundSetVerified, { verified: false });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { verified: boolean };
    expect(data.verified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// playgroundDeleteCard / playgroundDeleteAllMyCards
// ---------------------------------------------------------------------------

describe("playgroundDeleteCard", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await expect(t.mutation(api.admin.playgroundDeleteCard, { cardId })).rejects.toThrow("Administrator");
  });

  test("deletes the card from the list", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundDeleteCard, { cardId });
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: Array<{ id: Id<"cards"> }> };
    expect(data.cards.find((c) => c.id === cardId)).toBeUndefined();
  });

  test("throws when card does not exist", async () => {
    const t = makeT();
    const cardId = await createPgCard(t);
    await t.withIdentity(adminIdentity).mutation(api.admin.playgroundDeleteCard, { cardId });
    await expect(t.withIdentity(adminIdentity).mutation(api.admin.playgroundDeleteCard, { cardId })).rejects.toThrow("not found");
  });
});

describe("playgroundDeleteAllMyCards", () => {
  test("non-admin is rejected", async () => {
    const t = makeT();
    await expect(t.mutation(api.admin.playgroundDeleteAllMyCards, {})).rejects.toThrow("Administrator");
  });

  test("deletes all admin cards and returns count", async () => {
    const t = makeT();
    await createPgCard(t);
    await createPgCard(t, { name: "Second" });
    await createPgCard(t, { name: "Third" });
    const result = await t.withIdentity(adminIdentity).mutation(api.admin.playgroundDeleteAllMyCards, {}) as { deleted: number };
    expect(result.deleted).toBe(3);
    const data = await t.withIdentity(adminIdentity).query(api.admin.playgroundGetMyCards, {}) as { cards: unknown[] };
    expect(data.cards).toHaveLength(0);
  });

  test("is a no-op when there are no cards", async () => {
    const t = makeT();
    const result = await t.withIdentity(adminIdentity).mutation(api.admin.playgroundDeleteAllMyCards, {}) as { deleted: number };
    expect(result.deleted).toBe(0);
  });
});
