import { expect, test, type Page } from "@playwright/test";

async function openFilters(page: Page, mobile = false) {
  const consent = page.getByRole("dialog", { name: "Analytics consent" });
  if (await consent.isVisible().catch(() => false)) {
    const decline = consent.getByRole("button", { name: "Decline" });
    if (await decline.isVisible().catch(() => false)) {
      await decline.click();
      await expect(consent).toHaveCount(0);
    }
  }
  const compact = mobile || (page.viewportSize()?.width ?? 1280) < 1000;
  if (compact) {
    await page.locator(".mobile-menu-toggle").click();
    await page.waitForFunction(() => document.querySelector(".topbar nav")?.classList.contains("mobile-open"));
  }

  await page.locator(".filter-btn").click();
  await expect(page.locator(".filter-panel")).toBeVisible();
}

test.describe("Wall filter smoke", () => {
  test("apply and reset category filters update the route and badge", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/us", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".wall")).toBeAttached();
    await page.waitForTimeout(4000);
    await expect(page).toHaveURL(/\/us(?:\?|$)/);

    await openFilters(page);
    await page.locator(".filter-panel select").first().selectOption({ label: "Services" });
    await page.locator(".filter-panel .primary").click({ force: true });
    await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/us\/services(?:\?|$)/);
    await expect(page.locator(".filter-badge")).toHaveText("1");

    await openFilters(page);
    await page.locator(".filter-panel .filter-clear-btn").last().click({ force: true });
    await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/us(?:\?|$)/);
    await expect(page.locator(".filter-badge")).toHaveCount(0);

    const relevantErrors = errors.filter((entry) => !entry.includes("Hydration") && !entry.includes("hydration"));
    expect(relevantErrors).toHaveLength(0);
  });

  test("category filter remains usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/us", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".wall")).toBeAttached();
    await page.waitForTimeout(4000);

    await openFilters(page, true);
    await page.locator(".filter-panel select").first().selectOption({ label: "Services" });
    await page.locator(".filter-panel .primary").click({ force: true });
    await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/us\/services(?:\?|$)/);
    await expect(page.locator(".filter-badge")).toHaveText("1");
  });

  test("has phone and has email filters narrow the wall cards", async ({ page }) => {
    await page.goto("/us", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".wall")).toBeAttached();
    await page.waitForTimeout(4000);
    const beforeCount = await page.locator(".wall-card").count();

    await openFilters(page);
    await page.getByRole("checkbox", { name: "Has phone" }).check();
    await page.getByRole("checkbox", { name: "Has email" }).check();
    await page.locator(".filter-panel .primary").click({ force: true });

    await expect(page.locator(".filter-badge")).toHaveText("2");
    await expect.poll(() => page.locator(".wall-card").count(), { timeout: 20_000 }).toBeLessThan(beforeCount);
  });
});
