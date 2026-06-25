import { test, expect } from "@playwright/test";

/**
 * E2E tests for the /trending page.
 *
 * Covers: page load, tab navigation, wall card grid, sticky nav behaviour.
 * No auth required — all data is public.
 */

test.describe("Trending page — load", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trending");
  });

  test("page title includes Trending", async ({ page }) => {
    await expect(page).toHaveTitle(/trending/i);
  });

  test("h1 heading is visible", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/trending/i);
  });

  test("no 404 or 500 response", async ({ page }) => {
    const response = await page.goto("/trending");
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("Trending page — tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trending");
  });

  test("Trending Walls tab is active by default", async ({ page }) => {
    const activeTab = page.locator(".trending-tab.active");
    await expect(activeTab).toBeVisible();
    await expect(activeTab).toContainText(/trending walls/i);
  });

  test("all 5 tabs are visible", async ({ page }) => {
    const tabs = page.locator(".trending-tab");
    await expect(tabs).toHaveCount(5);
  });

  test("clicking Most Liked tab switches active tab", async ({ page }) => {
    await page.locator(".trending-tab", { hasText: /most liked/i }).click();
    const activeTab = page.locator(".trending-tab.active");
    await expect(activeTab).toContainText(/most liked/i);
  });

  test("clicking Most Reviewed tab switches active tab", async ({ page }) => {
    await page.locator(".trending-tab", { hasText: /most reviewed/i }).click();
    const activeTab = page.locator(".trending-tab.active");
    await expect(activeTab).toContainText(/most reviewed/i);
  });

  test("tab description text updates on tab switch", async ({ page }) => {
    const desc = page.locator(".trending-tab-desc");
    const initial = await desc.textContent();
    await page.locator(".trending-tab", { hasText: /most liked/i }).click();
    const updated = await desc.textContent();
    expect(updated).not.toBe(initial);
  });

  test("tab hash is updated in URL on switch", async ({ page }) => {
    await page.locator(".trending-tab", { hasText: /most liked/i }).click();
    expect(page.url()).toContain("#liked");
  });

  test("direct URL with #liked hash activates Most Liked tab", async ({ page }) => {
    await page.goto("/trending#liked");
    const activeTab = page.locator(".trending-tab.active");
    await expect(activeTab).toContainText(/most liked/i);
  });
});

test.describe("Trending page — walls grid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trending");
  });

  test("trending walls grid is rendered", async ({ page }) => {
    const content = page.locator(".trending-walls-grid, .trending-empty");
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test("wall cards have city name text", async ({ page }) => {
    const grid = page.locator(".trending-walls-grid");
    const empty = page.locator(".trending-empty");
    const hasGrid = await grid.isVisible().catch(() => false);
    if (!hasGrid) {
      await expect(empty).toBeVisible();
      return;
    }
    const firstCard = grid.locator(".trending-wall-card").first();
    await expect(firstCard.locator(".twc-city")).toBeVisible();
  });

  test("wall cards link to the wall page", async ({ page }) => {
    const grid = page.locator(".trending-walls-grid");
    const hasGrid = await grid.isVisible().catch(() => false);
    if (!hasGrid) return;
    const firstCard = grid.locator(".trending-wall-card").first();
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/(us|gb|ca|au)/);
  });
});

test.describe("Trending page — sticky navigation", () => {
  test("home nav stays visible after scrolling down", async ({ page }) => {
    await page.goto("/trending");
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect(page.locator(".home-nav")).toBeVisible();
  });

  test("tab bar stays visible after scrolling down", async ({ page }) => {
    await page.goto("/trending");
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect(page.locator(".trending-topbar")).toBeVisible();
  });
});

test.describe("Trending page — responsive", () => {
  test("renders on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/trending");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });

  test("tab labels are visible on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/trending");
    await expect(page.locator(".trending-tab").first()).toBeVisible();
  });
});
