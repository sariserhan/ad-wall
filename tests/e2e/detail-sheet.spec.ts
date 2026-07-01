import { test, expect } from "@playwright/test";

test.describe("Detail sheet and quick tools", () => {
  test("detail sheet uses the 404 paper treatment", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/us");
    await expect(page.locator(".wall-card").first()).toBeVisible({ timeout: 10_000 });

    await page.locator('button[aria-label="Switch to list view"]').click();
    await expect(page.locator(".list-card-list .wall-card").first()).toBeVisible();

    await page.locator(".list-card-list .wall-card").first().click();

    await expect(page.locator(".detail-sheet")).toBeVisible();
    await expect(page.locator(".detail-sheet-stamp")).toContainText("DETAILS");
    await expect(page.locator(".detail-sheet .nf-tape")).toBeVisible();
  });

  test("left bottom tools can collapse into one button", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/us");

    const tools = page.locator(".wall-tools");
    await expect(tools).toBeVisible();
    await expect(page.locator(".wall-tools-items")).toBeVisible();

    await page.locator(".wall-tools-toggle").click();

    await expect(page.locator(".wall-tools-items")).not.toBeVisible();
    await expect(page.locator(".wall-tools-toggle")).toBeVisible();
  });
});
