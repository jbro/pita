import { spawnSync } from "node:child_process";

const build = spawnSync("npm", ["run", "build"], { stdio: "inherit" });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const playwright = spawnSync("npx", ["playwright", "test", "--config", "playwright.config.ts"], {
  stdio: "inherit"
});

process.exit(playwright.status ?? 1);
