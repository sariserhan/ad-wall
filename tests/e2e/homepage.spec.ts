import { test, expect } from "@playwright/test";

/**
 * E2E tests for the LocalWall homepage (/).
 *
 * The homepage is hero-only: nav, hero section with search, and footer.
 * A "How it works" modal is triggered from the footer.
 */

test.describe("Homepage — structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title includes LocalWall", async ({ page }) => {
    await expect(page).toHaveTitle(/localwall/i);
  });

  test("nav brand is visible", async ({ page }) => {
    await expect(page.locator(".home-nav-brand")).toBeVisible();
  });

  test("h1 hero title is visible", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/local wall/i);
  });

  test("hero subtitle is visible", async ({ page }) => {
    await expect(page.locator(".home-hero-subtitle")).toBeVisible();
  });

  test("Find ads near me button is present", async ({ page }) => {
    await expect(page.locator("button", { hasText: /find ads near me|open .* wall/i }).first()).toBeVisible();
  });

  test("Post for free button is present", async ({ page }) => {
    await expect(page.locator("button", { hasText: /post for free/i })).toBeVisible();
  });

  test("search form is present", async ({ page }) => {
    await expect(page.locator(".home-search-form")).toBeVisible();
  });

  test("footer is visible", async ({ page }) => {
    await expect(page.locator(".home-footer")).toBeVisible();
  });

  test("footer contains Terms link", async ({ page }) => {
    const link = page.locator(".home-footer a", { hasText: /terms/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/terms-and-conditions");
  });

  test("footer contains Privacy link", async ({ page }) => {
    const link = page.locator(".home-footer a", { hasText: /privacy/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/privacy-policy");
  });
});

test.describe("Homepage — How it works modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("How it works button is visible in the footer", async ({ page }) => {
    await expect(page.locator(".home-footer-how-btn")).toBeVisible();
  });

  test("modal is not visible on page load", async ({ page }) => {
    await expect(page.locator(".hiw-backdrop")).toHaveCount(0);
  });

  test("clicking How it works opens the modal", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    await expect(page.locator(".hiw-backdrop")).toBeVisible();
    await expect(page.locator(".hiw-modal")).toBeVisible();
  });

  test("modal title says How LocalWall works", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    await expect(page.locator(".hiw-title")).toContainText(/how localwall works/i);
  });

  test("modal has 4 steps", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    await expect(page.locator(".hiw-step")).toHaveCount(4);
  });

  test("each step has an icon and a title", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    const steps = page.locator(".hiw-step");
    for (let i = 0; i < 4; i++) {
      await expect(steps.nth(i).locator(".hiw-step-icon")).toBeVisible();
      await expect(steps.nth(i).locator(".hiw-step-title")).toBeVisible();
    }
  });

  test("close button dismisses the modal", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    await expect(page.locator(".hiw-modal")).toBeVisible();
    await page.locator(".hiw-close").click();
    await expect(page.locator(".hiw-backdrop")).toHaveCount(0);
  });

  test("pressing Escape closes the modal", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    await expect(page.locator(".hiw-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".hiw-backdrop")).toHaveCount(0);
  });

  test("clicking the backdrop closes the modal", async ({ page }) => {
    await page.locator(".home-footer-how-btn").click();
    await expect(page.locator(".hiw-backdrop")).toBeVisible();
    await page.locator(".hiw-backdrop").click({ position: { x: 10, y: 10 } });
    await expect(page.locator(".hiw-backdrop")).toHaveCount(0);
  });
});

test.describe("Homepage — search form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("keyword input accepts text", async ({ page }) => {
    const input = page.locator(".home-search-input");
    await input.fill("plumber");
    await expect(input).toHaveValue("plumber");
  });

  test("category select has All categories as default", async ({ page }) => {
    const select = page.locator(".home-search-select");
    await expect(select).toHaveValue("All");
  });

  test("search submit button is present", async ({ page }) => {
    await expect(page.locator(".home-search-submit")).toBeVisible();
  });

  test("submitting search navigates to a wall page", async ({ page }) => {
    await page.locator(".home-search-submit").click();
    await page.waitForURL(/\/(us|[a-z]{2})(\/|$)/, { timeout: 8_000 });
  });
});

test.describe("Homepage — responsive", () => {
  test("mobile: hero title is visible at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mobile: no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });

  test("nav sticky: remains visible after scroll", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect(page.locator(".home-nav")).toBeVisible();
  });
});
