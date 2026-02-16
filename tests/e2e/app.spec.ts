import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import path from "node:path";

test("app window opens and shows title", async () => {
  const app = await electron.launch({
    args: [path.resolve("dist/main/main.cjs")],
    timeout: 15_000,
  });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  const title = await window.locator("h1").textContent();
  expect(title).toBe("Pita");

  await app.close();
});
