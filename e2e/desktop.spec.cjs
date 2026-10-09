const { test, expect } = require("@playwright/test");

async function startDesktop(page) {
  await page.goto("/?nosw=1");
  await expect(page.locator("#boot")).toHaveClass(/done/, { timeout: 10_000 });
  await expect(page.locator("#dock .xp-start")).toBeVisible();
}

async function openFromStart(page, appName) {
  await page.locator("#dock .xp-start").click();
  await expect(page.locator("#launcher")).not.toHaveClass(/hidden/);
  const app = page.locator(".app-card").filter({ hasText: appName });
  await expect(app).toBeVisible();
  await app.click();
}

test("desktop boots and exposes the XP-style Start menu and taskbar clock", async ({ page }) => {
  await startDesktop(page);
  await expect(page.locator("#dock")).toBeVisible();
  await expect(page.locator("#dock #clock")).not.toBeEmpty();
  await page.locator("#dock .xp-start").click();
  await expect(page.locator("#launcher")).not.toHaveClass(/hidden/);
  await expect(page.locator("#app-search")).toBeFocused();
  await expect(page.locator(".app-card")).toHaveCount(15);
});

test("window minimize, taskbar restore, maximize, and close work", async ({ page }) => {
  await startDesktop(page);
  await openFromStart(page, "Calculator");

  const win = page.locator('.window[data-app="calculator"]');
  await expect(win).toBeVisible();
  await win.locator("[data-min]").click();
  await expect(win).toBeHidden();

  const taskButton = page.locator('[data-task-window="calculator"]');
  await expect(taskButton).toBeVisible();
  await taskButton.click();
  await expect(win).toBeVisible();

  await win.locator("[data-max]").click();
  await expect(win).toHaveAttribute("data-maxed", "1");
  await win.locator("[data-max]").click();
  await expect(win).not.toHaveAttribute("data-maxed", "1");

  await win.locator("[data-close]").click();
  await expect(win).toHaveCount(0);
  await expect(page.locator('[data-task-window="calculator"]')).toHaveCount(0);
});

test("Notepad saves workspace content locally and keeps it after reload", async ({ page }) => {
  await startDesktop(page);

  // Built-in apps request explicit filesystem permissions before mounting.
  // Accept that expected prompt so the test exercises Notepad itself.
  page.on("dialog", async dialog => {
    await dialog.accept();
  });

  await openFromStart(page, "Notepad");
  const win = page.locator('.window[data-app="editor"]');
  const editor = win.locator(".window-body textarea");
  await expect(win).toBeVisible();
  await expect(editor).toBeVisible();

  const marker = "PIJUSH OS E2E persistence check";
  await editor.fill(marker);
  await win.locator("[data-save]").click();
  await expect(page.locator("#notifications")).toContainText("Saved notes.txt locally");

  await page.goto("/?nosw=1");
  await expect(page.locator("#boot")).toHaveClass(/done/, { timeout: 10_000 });
  await openFromStart(page, "Notepad");
  await expect(page.locator('.window[data-app="editor"] .window-body textarea')).toHaveValue(marker);
});

test("desktop remains usable at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startDesktop(page);
  await expect(page.locator("#dock .xp-start")).toBeVisible();
  await openFromStart(page, "Calculator");
  await expect(page.locator('.window[data-app="calculator"]')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    desktop: document.querySelector("#desktop").getBoundingClientRect().width,
  }));
  expect(dimensions.desktop).toBeGreaterThan(0);
  expect(dimensions.desktop).toBeLessThanOrEqual(dimensions.viewport + 1);
});
