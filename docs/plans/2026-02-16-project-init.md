# Project Techstack Initialization Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize the Pita project from a clean repo to a running Electron + React app with all tooling configured and a single smoke test proving the stack works end-to-end.

**Architecture:** Electron main process built by Vite (library mode, node target). Renderer built by Vite with React plugin. Preload script built alongside main. Shared types importable by both sides via the unified Vite build.

**Tech Stack:** Electron, TypeScript, React, Jotai, Tailwind CSS, shadcn/ui, Vite (both processes), Vitest, Playwright, Bun.

---

### Task 1: Initialize package.json and install core dependencies

**Files:**
- Create: `package.json`

**Step 1: Create package.json**

```bash
cd /home/jbr/projects/pita
bun init -y
```

Then replace the generated `package.json` with:

```json
{
  "name": "pita",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "concurrently -k \"vite\" \"wait-on tcp:5173 && vite build --config vite.main.config.ts --mode development && VITE_DEV_SERVER_URL=http://localhost:5173 electron .\"",
    "build": "vite build --config vite.main.config.ts && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Step 2: Install dependencies**

```bash
bun add react react-dom jotai clsx tailwind-merge class-variance-authority @radix-ui/react-slot lucide-react
bun add -d typescript electron vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @playwright/test playwright concurrently wait-on tailwindcss@3 tailwindcss-animate autoprefixer postcss @types/react @types/react-dom @types/node
```

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: initialize package.json with dependencies"
```

---

### Task 2: TypeScript configuration

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`

**Step 1: Create `tsconfig.json` (renderer + shared type checking)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/renderer/*"],
      "@shared/*": ["./src/shared/*"]
    },
    "types": ["vite/client", "vitest/globals"]
  },
  "include": [
    "src/renderer",
    "src/shared",
    "src/main",
    "src/preload",
    "vite.config.ts",
    "vite.main.config.ts",
    "vitest.config.ts"
  ]
}
```

**Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add TypeScript config"
```

---

### Task 3: Vite configs for renderer and main process

**Files:**
- Create: `vite.config.ts` (renderer)
- Create: `vite.main.config.ts` (main + preload)

**Step 1: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: false,
  },
});
```

**Step 2: Create `vite.main.config.ts`**

This builds both the main process and preload script as separate entry points using Vite in library mode targeting Node.

```ts
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    ssr: true,
    rollupOptions: {
      input: {
        "main/main": path.resolve(__dirname, "src/main/main.ts"),
        "preload/preload": path.resolve(__dirname, "src/preload/preload.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "cjs",
      },
      external: ["electron"],
    },
    target: "node22",
  },
});
```

**Step 3: Commit**

```bash
git add vite.config.ts vite.main.config.ts
git commit -m "chore: add Vite configs for renderer and main process"
```

---

### Task 4: Tailwind CSS and PostCSS setup

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.cjs`
- Create: `src/renderer/styles.css`

**Step 1: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
```

**Step 2: Create `postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: Create `src/renderer/styles.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 4: Commit**

```bash
git add tailwind.config.ts postcss.config.cjs src/renderer/styles.css
git commit -m "chore: add Tailwind CSS and PostCSS config"
```

---

### Task 5: shadcn/ui utility and components.json

**Files:**
- Create: `components.json`
- Create: `src/renderer/lib/utils.ts`

**Step 1: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/renderer/styles.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Step 2: Create `src/renderer/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**Step 3: Commit**

```bash
git add components.json src/renderer/lib/utils.ts
git commit -m "chore: add shadcn/ui config and cn utility"
```

---

### Task 6: Vitest and Playwright configs

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

**Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

**Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 1,
  reporter: "list",
});
```

**Step 3: Commit**

```bash
git add vitest.config.ts playwright.config.ts
git commit -m "chore: add Vitest and Playwright configs"
```

---

### Task 7: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Replace `.gitignore`**

```
.worktrees/
node_modules/
dist/
*.tsbuildinfo
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for build artifacts"
```

---

### Task 8: Shared IPC contract stub

**Files:**
- Create: `src/shared/ipc.ts`

**Step 1: Create `src/shared/ipc.ts`**

A minimal shared contract to prove the unified Vite build works across processes.

```ts
export const IPC_CHANNELS = {
  ping: "app.ping",
} as const;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
```

**Step 2: Commit**

```bash
git add src/shared/ipc.ts
git commit -m "chore: add shared IPC contract stub"
```

---

### Task 9: Preload script

**Files:**
- Create: `src/preload/preload.ts`

**Step 1: Create `src/preload/preload.ts`**

```ts
import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc";

contextBridge.exposeInMainWorld("pita", {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
});
```

**Step 2: Commit**

```bash
git add src/preload/preload.ts
git commit -m "chore: add preload script with shared IPC import"
```

---

### Task 10: Electron main process entry

**Files:**
- Create: `src/main/main.ts`

**Step 1: Create `src/main/main.ts`**

```ts
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { IPC_CHANNELS } from "@shared/ipc";

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");

  const mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
```

**Step 2: Commit**

```bash
git add src/main/main.ts
git commit -m "chore: add Electron main process entry"
```

---

### Task 11: Renderer entry and minimal App component

**Files:**
- Create: `index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/store/index.ts`

**Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pita</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create `src/renderer/store/index.ts`**

```ts
import { createStore } from "jotai";

export const store = createStore();
```

**Step 3: Create `src/renderer/App.tsx`**

```tsx
export function App(): JSX.Element {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-bold">Pita</h1>
    </div>
  );
}
```

**Step 4: Create `src/renderer/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "jotai";
import { App } from "./App";
import { store } from "./store";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
```

**Step 5: Commit**

```bash
git add index.html src/renderer/main.tsx src/renderer/App.tsx src/renderer/store/index.ts
git commit -m "chore: add renderer entry, App component, and Jotai store"
```

---

### Task 12: Verify the dev build runs

**Step 1: Build the main process**

```bash
vite build --config vite.main.config.ts --mode development
```

Expected: builds to `dist/main/main.js` and `dist/preload/preload.js` without errors.

**Step 2: Verify the files exist**

```bash
ls dist/main/main.js dist/preload/preload.js
```

Expected: both files listed.

**Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: no errors.

**Step 4: Run vitest (no tests yet, should exit cleanly)**

```bash
bun run test
```

Expected: exits with 0 tests, no errors.

---

### Task 13: Write a Vitest smoke test

**Files:**
- Create: `src/renderer/__tests__/app.test.tsx`

**Step 1: Write the test**

```tsx
import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";

describe("App", () => {
  it("renders the app title", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText("Pita")).toBeInTheDocument();
  });
});
```

**Step 2: Run the test**

```bash
bun run test
```

Expected: 1 test passes.

**Step 3: Commit**

```bash
git add src/renderer/__tests__/app.test.tsx
git commit -m "test: add renderer smoke test"
```

---

### Task 14: Write a Playwright Electron smoke test

**Files:**
- Create: `tests/e2e/app.spec.ts`

**Step 1: Write the test**

```ts
import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import path from "node:path";

test("app window opens and shows title", async () => {
  // Build first
  const app = await electron.launch({
    args: [path.resolve("dist/main/main.js")],
  });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  const title = await window.locator("h1").textContent();
  expect(title).toBe("Pita");

  await app.close();
});
```

**Step 2: Build the app for E2E**

```bash
bun run build
```

Expected: renderer and main both build without errors.

**Step 3: Run the E2E test**

```bash
bun run test:e2e
```

Expected: 1 test passes — Electron opens, finds "Pita" heading, closes.

**Step 4: Commit**

```bash
git add tests/e2e/app.spec.ts
git commit -m "test: add Playwright Electron smoke test"
```

---

### Task 15: Final verification and cleanup commit

**Step 1: Run all gates**

```bash
bun run typecheck
bun run test
bun run test:e2e
```

Expected: all pass.

**Step 2: Commit any remaining changes**

```bash
git add -A
git status
```

If there are unstaged changes, commit:

```bash
git commit -m "chore: project techstack initialization complete"
```
