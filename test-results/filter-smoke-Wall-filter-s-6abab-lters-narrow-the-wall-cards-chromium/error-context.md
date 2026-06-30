# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: filter-smoke.spec.ts >> Wall filter smoke >> has phone and has email filters narrow the wall cards
- Location: tests/e2e/filter-smoke.spec.ts:63:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:3000/us
Call log:
  - navigating to "http://localhost:3000/us", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | 
  3  | async function openFilters(page: Page, mobile = false) {
  4  |   const consent = page.getByRole("dialog", { name: "Analytics consent" });
  5  |   if (await consent.isVisible().catch(() => false)) {
  6  |     const decline = consent.getByRole("button", { name: "Decline" });
  7  |     if (await decline.isVisible().catch(() => false)) {
  8  |       await decline.click();
  9  |       await expect(consent).toHaveCount(0);
  10 |     }
  11 |   }
  12 |   const compact = mobile || (page.viewportSize()?.width ?? 1280) < 1000;
  13 |   if (compact) {
  14 |     await page.locator(".mobile-menu-toggle").click();
  15 |     await page.waitForFunction(() => document.querySelector(".topbar nav")?.classList.contains("mobile-open"));
  16 |   }
  17 | 
  18 |   await page.locator(".filter-btn").click();
  19 |   await expect(page.locator(".filter-panel")).toBeVisible();
  20 | }
  21 | 
  22 | test.describe("Wall filter smoke", () => {
  23 |   test("apply and reset category filters update the route and badge", async ({ page }) => {
  24 |     const errors: string[] = [];
  25 |     page.on("pageerror", (error) => errors.push(error.message));
  26 |     page.on("console", (message) => {
  27 |       if (message.type() === "error") errors.push(message.text());
  28 |     });
  29 | 
  30 |     await page.goto("/us", { waitUntil: "domcontentloaded" });
  31 |     await expect(page.locator(".wall")).toBeAttached();
  32 |     await page.waitForTimeout(4000);
  33 |     await expect(page).toHaveURL(/\/us(?:\?|$)/);
  34 | 
  35 |     await openFilters(page);
  36 |     await page.locator(".filter-panel select").first().selectOption({ label: "Services" });
  37 |     await page.locator(".filter-panel .primary").click({ force: true });
  38 |     await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/us\/services(?:\?|$)/);
  39 |     await expect(page.locator(".filter-badge")).toHaveText("1");
  40 | 
  41 |     await openFilters(page);
  42 |     await page.locator(".filter-panel .filter-clear-btn").last().click({ force: true });
  43 |     await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/us(?:\?|$)/);
  44 |     await expect(page.locator(".filter-badge")).toHaveCount(0);
  45 | 
  46 |     const relevantErrors = errors.filter((entry) => !entry.includes("Hydration") && !entry.includes("hydration"));
  47 |     expect(relevantErrors).toHaveLength(0);
  48 |   });
  49 | 
  50 |   test("category filter remains usable on mobile viewport", async ({ page }) => {
  51 |     await page.setViewportSize({ width: 390, height: 844 });
  52 |     await page.goto("/us", { waitUntil: "domcontentloaded" });
  53 |     await expect(page.locator(".wall")).toBeAttached();
  54 |     await page.waitForTimeout(4000);
  55 | 
  56 |     await openFilters(page, true);
  57 |     await page.locator(".filter-panel select").first().selectOption({ label: "Services" });
  58 |     await page.locator(".filter-panel .primary").click({ force: true });
  59 |     await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/us\/services(?:\?|$)/);
  60 |     await expect(page.locator(".filter-badge")).toHaveText("1");
  61 |   });
  62 | 
  63 |   test("has phone and has email filters narrow the wall cards", async ({ page }) => {
> 64 |     await page.goto("/us", { waitUntil: "domcontentloaded" });
     |                ^ Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:3000/us
  65 |     await expect(page.locator(".wall")).toBeAttached();
  66 |     await page.waitForTimeout(4000);
  67 |     const beforeCount = await page.locator(".wall-card").count();
  68 | 
  69 |     await openFilters(page);
  70 |     await page.getByRole("checkbox", { name: "Has phone" }).check();
  71 |     await page.getByRole("checkbox", { name: "Has email" }).check();
  72 |     await page.locator(".filter-panel .primary").click({ force: true });
  73 | 
  74 |     await expect(page.locator(".filter-badge")).toHaveText("2");
  75 |     await expect.poll(() => page.locator(".wall-card").count(), { timeout: 20_000 }).toBeLessThan(beforeCount);
  76 |   });
  77 | });
  78 | 
```