import { _electron as electron, expect, test } from "@playwright/test";

test("phase1 ui shell smoke", async () => {
  const electronApp = await electron.launch({
    args: ["dist/main/main.js"]
  });

  try {
    const window = await electronApp.firstWindow();

    await expect(window.getByTestId("timeline-panel")).toBeVisible();
    await expect(window.getByTestId("prompt-composer-panel")).toBeVisible();
    await expect(window.getByTestId("command-palette-placeholder")).toBeVisible();
  } finally {
    await electronApp.close();
  }
});
