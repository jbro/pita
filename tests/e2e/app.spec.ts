import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import path from "node:path";

async function launchWithMemfs() {
  const app = await electron.launch({
    args: [path.resolve("dist/main/main.cjs")],
    env: {
      ...process.env,
      PITA_USE_MEMFS: "1",
    },
    timeout: 15_000,
  });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");
  return { app, window };
}

test("shows prepopulated recent projects and opens on click", async () => {
  const { app, window } = await launchWithMemfs();

  await expect(window.getByText("/home/dev/my-app")).toBeVisible();
  await expect(window.getByText("/home/dev/side-project")).toBeVisible();

  await window.getByText("/home/dev/my-app").click();
  await expect(window.getByText("Session: /home/dev/my-app")).toBeVisible();

  await app.close();
});

test("navigates forward in Miller columns by opening a folder", async () => {
  const { app, window } = await launchWithMemfs();

  await expect(window.getByText("work")).toBeVisible();
  await window.getByText("work").dblclick();

  await expect(window.getByText("client-a")).toBeVisible();
  await expect(window.getByText("ideas")).toBeVisible();

  await app.close();
});

test("creates folder and creates project from selected non-git folder", async () => {
  const { app, window } = await launchWithMemfs();

  await expect(window.getByText("documents")).toBeVisible();
  await window.getByText("documents").click();

  const newFolderButton = window.getByRole("button", { name: /new folder/i });
  await expect(newFolderButton).toBeEnabled();
  await newFolderButton.click();
  await expect(window.getByText("Folder name:")).toBeVisible();

  const input = window.getByRole("textbox");
  await input.fill("new-sandbox");
  await input.press("Enter");

  await expect(window.getByText("Folder created: new-sandbox")).toBeVisible();
  await expect(window.getByRole("button", { name: "new-sandbox" })).toBeVisible();

  window.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  const createProjectButton = window.getByRole("button", { name: /create project/i });
  await expect(createProjectButton).toBeEnabled();
  await createProjectButton.click();

  await expect(window.getByText("Session: /home/dev/documents")).toBeVisible();

  await app.close();
});
