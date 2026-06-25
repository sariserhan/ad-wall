import { expect, test, describe } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeT, userIdentity, validCard } from "./helpers";

// ---------------------------------------------------------------------------
// recordVisit
// ---------------------------------------------------------------------------

describe("recordVisit", () => {
  test("creates a wall record on first visit and returns viewCount 1", async () => {
    const t = makeT();
    const result = await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" }) as { viewCount: number };
    expect(result.viewCount).toBe(1);
  });

  test("increments viewCount on subsequent visits to the same path", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const result = await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" }) as { viewCount: number };
    expect(result.viewCount).toBe(3);
  });

  test("normalises trailing slashes — /us/wa/seattle/ equals /us/wa/seattle", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const result = await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle/" }) as { viewCount: number };
    expect(result.viewCount).toBe(2);
  });

  test("normalises uppercase — /US/WA/SEATTLE equals /us/wa/seattle", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const result = await t.mutation(api.walls.recordVisit, { path: "/US/WA/SEATTLE" }) as { viewCount: number };
    expect(result.viewCount).toBe(2);
  });

  test("treats different paths as separate walls", async () => {
    const t = makeT();
    const r1 = await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" }) as { viewCount: number };
    const r2 = await t.mutation(api.walls.recordVisit, { path: "/us/ny/new-york" }) as { viewCount: number };
    expect(r1.viewCount).toBe(1);
    expect(r2.viewCount).toBe(1);
  });

  test("authenticated visit stores userId in wallVisits", async () => {
    const t = makeT();
    await t.withIdentity(userIdentity).mutation(api.cards.create, validCard);
    await t.withIdentity(userIdentity).mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const visitors = await t.query(api.walls.getVisitors, { path: "/us/wa/seattle" });
    expect(visitors.length).toBeGreaterThan(0);
  });

  test("anonymous visit still records to wallVisits", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const visitors = await t.query(api.walls.getVisitors, { path: "/us/wa/seattle" });
    expect(visitors.length).toBe(1);
    expect(visitors[0].userId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getWall
// ---------------------------------------------------------------------------

describe("getWall", () => {
  test("returns null for a path that has never been visited", async () => {
    const t = makeT();
    const wall = await t.query(api.walls.getWall, { path: "/us/wa/seattle" });
    expect(wall).toBeNull();
  });

  test("returns wall data after a visit", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const wall = await t.query(api.walls.getWall, { path: "/us/wa/seattle" });
    expect(wall).not.toBeNull();
    expect(wall!.path).toBe("/us/wa/seattle");
    expect(wall!.viewCount).toBe(1);
  });

  test("normalises path when querying", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const wall = await t.query(api.walls.getWall, { path: "/US/WA/SEATTLE/" });
    expect(wall).not.toBeNull();
    expect(wall!.viewCount).toBe(1);
  });

  test("returns updated viewCount after multiple visits", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/ca/los-angeles" });
    await t.mutation(api.walls.recordVisit, { path: "/us/ca/los-angeles" });
    const wall = await t.query(api.walls.getWall, { path: "/us/ca/los-angeles" });
    expect(wall!.viewCount).toBe(2);
  });

  test("returns createdAt and updatedAt timestamps", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const wall = await t.query(api.walls.getWall, { path: "/us/wa/seattle" });
    expect(wall!.createdAt).toBeGreaterThan(0);
    expect(wall!.updatedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getTopWalls
// ---------------------------------------------------------------------------

describe("getTopWalls", () => {
  test("returns empty array when no walls exist", async () => {
    const t = makeT();
    const tops = await t.query(api.walls.getTopWalls, {});
    expect(tops).toEqual([]);
  });

  test("only returns 3-segment city-level paths", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us" });
    await t.mutation(api.walls.recordVisit, { path: "/us/wa" });
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const tops = await t.query(api.walls.getTopWalls, {});
    expect(tops).toHaveLength(1);
    expect(tops[0].path).toBe("/us/wa/seattle");
  });

  test("sorts by viewCount descending", async () => {
    const t = makeT();
    for (let i = 0; i < 5; i++) await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    for (let i = 0; i < 2; i++) await t.mutation(api.walls.recordVisit, { path: "/us/ny/new-york" });
    await t.mutation(api.walls.recordVisit, { path: "/us/ca/los-angeles" });
    const tops = await t.query(api.walls.getTopWalls, {});
    expect(tops[0].path).toBe("/us/wa/seattle");
    expect(tops[1].path).toBe("/us/ny/new-york");
    expect(tops[2].path).toBe("/us/ca/los-angeles");
  });

  test("respects the limit argument", async () => {
    const t = makeT();
    const paths = ["/us/wa/seattle", "/us/ny/new-york", "/us/ca/los-angeles", "/us/tx/austin", "/us/fl/miami"];
    for (const p of paths) await t.mutation(api.walls.recordVisit, { path: p });
    const tops = await t.query(api.walls.getTopWalls, { limit: 3 });
    expect(tops).toHaveLength(3);
  });

  test("excludes paths with zero viewCount", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const tops = await t.query(api.walls.getTopWalls, {});
    expect(tops.every((w) => w.viewCount > 0)).toBe(true);
  });

  test("deduplicates paths — same path counted once", async () => {
    const t = makeT();
    for (let i = 0; i < 3; i++) await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const tops = await t.query(api.walls.getTopWalls, {});
    const seattleEntries = tops.filter((w) => w.path === "/us/wa/seattle");
    expect(seattleEntries).toHaveLength(1);
    expect(seattleEntries[0].viewCount).toBe(3);
  });

  test("returns path and viewCount fields", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const tops = await t.query(api.walls.getTopWalls, {});
    expect(tops[0]).toHaveProperty("path");
    expect(tops[0]).toHaveProperty("viewCount");
  });
});

// ---------------------------------------------------------------------------
// getVisitors
// ---------------------------------------------------------------------------

describe("getVisitors", () => {
  test("returns empty array for a path with no visits", async () => {
    const t = makeT();
    const visitors = await t.query(api.walls.getVisitors, { path: "/us/wa/seattle" });
    expect(visitors).toEqual([]);
  });

  test("returns one entry per visit", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const visitors = await t.query(api.walls.getVisitors, { path: "/us/wa/seattle" });
    expect(visitors.length).toBe(2);
  });

  test("each visitor entry has a visitedAt timestamp", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const visitors = await t.query(api.walls.getVisitors, { path: "/us/wa/seattle" });
    expect(visitors[0].visitedAt).toBeGreaterThan(0);
  });

  test("visitors for one wall do not appear under another", async () => {
    const t = makeT();
    await t.mutation(api.walls.recordVisit, { path: "/us/wa/seattle" });
    const visitors = await t.query(api.walls.getVisitors, { path: "/us/ny/new-york" });
    expect(visitors).toEqual([]);
  });
});
