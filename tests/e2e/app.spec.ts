import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import path from "node:path";

test("app opens to project selection screen", async () => {
  const app = await electron.launch({
    args: [path.resolve("dist/main/main.cjs")],
    timeout: 15_000,
  });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  await expect(window.getByText("Open Project")).toBeVisible();
  await expect(window.getByText("Recent", { exact: true })).toBeVisible();

  await app.close();
});

test("production build smoke: renders selection shell without dev fixtures", async () => {
  const app = await electron.launch({
    args: [path.resolve("dist/main/main.cjs")],
    timeout: 15_000,
  });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  // Intentionally does not assert seeded fixture entries here.
  // Seeded dev fixtures only apply when running with VITE_DEV_SERVER_URL in dev mode.
  await expect(window.getByText("Open Project")).toBeVisible();

  await app.close();
});
