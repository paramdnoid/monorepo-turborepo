import { expect, test } from "@playwright/test";

test.describe("web smoke", () => {
  test("home shows starter title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Turborepo Starter")).toBeVisible();
  });
});
