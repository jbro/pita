import { spawnSync } from "node:child_process";

const build = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const playwright = spawnSync("bun", ["x", "playwright", "test", "--config", "playwright.config.ts"], {
  stdio: "inherit"
});

process.exit(playwright.status ?? 1);
