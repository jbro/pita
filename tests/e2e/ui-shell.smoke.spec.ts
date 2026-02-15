import { _electron as electron, expect, test } from "@playwright/test";

test("phase1b send stream abort smoke", async () => {
  const electronApp = await electron.launch({
    args: ["dist/main/main.js"]
  });

  try {
    const window = await electronApp.firstWindow();

    await expect(window.getByTestId("timeline-panel")).toBeVisible();
    await expect(window.getByTestId("prompt-composer-panel")).toBeVisible();

    await expect.poll(async () => {
      return window.evaluate(() => typeof window.pita?.session?.sendPrompt);
    }).toBe("function");

    const promptInput = window.getByPlaceholder("Ask Pi to continue…");
    await expect(promptInput).toBeVisible();

    await promptInput.fill("Run smoke runtime prompt");
    await promptInput.press("Control+Enter");

    await expect.poll(async () => window.locator(".timeline-item").count()).toBeGreaterThan(0);
    await expect(window.getByText("Run smoke runtime prompt")).toBeVisible();
  } finally {
    await electronApp.close();
  }
});
