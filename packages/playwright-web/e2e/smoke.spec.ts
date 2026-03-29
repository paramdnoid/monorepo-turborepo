import { expect, test } from "@playwright/test";

test.describe("web smoke", () => {
  test("home loads with primary brand chrome", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /ZunftGewerk home/i }),
    ).toBeVisible();
  });
});
