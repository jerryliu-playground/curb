import { expect, test } from "@playwright/test";

// The main user flow (SPEC.md §3): generate → review → edit → see compliance flags → approve → export.
test("generate, edit, review flags, approve and export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /9081 Lookout Ridge Lane/ }).click();
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByRole("button", { name: "Slide 1: cover" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText("Round 1:")).toBeVisible();

  // Edit a headline: the slide re-renders and the form shows the new value.
  await page.getByRole("button", { name: "Slide 2: feature" }).click();
  await page.getByLabel(/Headline/).fill("Grey cabinetry kitchen");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel(/Headline/)).toHaveValue("Grey cabinetry kitchen");

  // A flagged phrase in the caption shows up, and approval needs the explicit tick.
  await page.getByLabel(/^Caption/).fill("Perfect for young families. A home in Burlington.");
  await page.getByRole("button", { name: "Save caption" }).click();
  await expect(page.getByText("“Perfect for young families”")).toBeVisible();
  const approve = page.getByRole("button", { name: "Approve for export" });
  await expect(approve).toBeDisabled();
  await page.getByLabel(/I reviewed the 1 compliance flag/).check();
  await approve.click();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export ZIP" }).click();
  expect((await download).suggestedFilename()).toBe("curb-01-modern.zip");
});
