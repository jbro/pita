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

test("command palette checklist smoke", async () => {
  const electronApp = await electron.launch({
    args: ["dist/main/main.js"]
  });

  try {
    const window = await electronApp.firstWindow();

    const promptInput = window.getByPlaceholder("Ask Pi to continue…");
    await expect(promptInput).toBeVisible();

    await promptInput.fill("timeline should clear");
    await promptInput.press("Control+Enter");
    await expect(window.getByText("timeline should clear")).toBeVisible();

    await promptInput.click();
    await window.keyboard.press("Control+K");

    const search = window.getByPlaceholder("Search commands...");
    await expect(search).toBeVisible();

    await expect
      .poll(async () => {
        return window.evaluate(() => {
          const active = document.activeElement;
          return active instanceof HTMLInputElement ? active.placeholder : "";
        });
      })
      .toBe("Search commands...");

    await search.fill("clear");
    await expect(window.getByRole("button", { name: /clear timeline/i })).toBeVisible();

    await search.press("ArrowDown");
    await search.press("ArrowUp");

    await search.press("Enter");
    await expect(window.getByText("timeline should clear")).toBeHidden();

    await promptInput.click();
    await window.keyboard.press("Control+K");
    await expect(search).toBeVisible();

    await search.fill("focus");
    await search.press("Enter");

    await expect
      .poll(async () => {
        return window.evaluate(() => {
          const textarea = document.querySelector(
            'textarea[placeholder="Ask Pi to continue…"]'
          );
          return document.activeElement === textarea;
        });
      })
      .toBe(true);

    await promptInput.click();
    await window.keyboard.press("Control+K");
    await expect(search).toBeVisible();
    await window.keyboard.press("Escape");
    await expect(search).toBeHidden();

    await promptInput.click();
    await window.keyboard.press("Control+K");
    await expect(search).toBeVisible();
    await window.locator(".command-palette-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(search).toBeHidden();
  } finally {
    await electronApp.close();
  }
});

test("abort after queued follow-ups does not emit already-processing error", async () => {
  const electronApp = await electron.launch({
    args: ["dist/main/main.js"],
    env: {
      ...process.env,
      PITA_RUNTIME_KIND: "stub",
      PITA_STUB_RUNTIME_MODE: "manual-abort"
    }
  });

  try {
    const window = await electronApp.firstWindow();
    const promptInput = window.getByPlaceholder("Ask Pi to continue…");

    await expect(promptInput).toBeVisible();

    await promptInput.fill("first prompt");
    await promptInput.press("Control+Enter");

    await window.locator(".composer-busy-indicator").waitFor({ state: "visible" });

    await promptInput.fill("queued one");
    await promptInput.press("Alt+Enter");

    await promptInput.fill("queued two");
    await promptInput.press("Alt+Enter");

    await promptInput.press("Escape");

    await window.locator(".composer-busy-indicator").waitFor({ state: "hidden" });

    await expect(window.getByText("Error: Agent is already processing", { exact: false })).toHaveCount(0);
  } finally {
    await electronApp.close();
  }
});
