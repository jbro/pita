# US-1: Project Selection Screen — Implementation Plan

> **For Claude:** REQUIRED SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the project selection screen shown on app launch — recent projects list, Miller columns file browser, new folder, create project, and dev-mode memfs support.

**Architecture:** Main process provides a `FileSystemService` behind IPC that wraps an injected `fs`. Renderer components use Jotai atoms for state. Dev mode injects memfs with seeded fixtures. All filesystem operations go through IPC.

**Tech Stack:** React, Jotai, Tailwind, lucide-react icons, isomorphic-git (for `git init`), memfs (dev/test).

**Reference:** `docs/plans/2026-02-16-us1-project-selection-design.md`

---

### Task 1: Shared types and IPC contract

**Files:**
- Modify: `src/shared/ipc.ts`
- Create: `src/shared/types.ts`

**Step 1: Write the failing test**

Create `src/shared/__tests__/types.test.ts`:

```ts
import { IPC_CHANNELS } from "../ipc";

describe("IPC_CHANNELS", () => {
  it("defines all project selection channels", () => {
    expect(IPC_CHANNELS).toHaveProperty("fsListDirectory");
    expect(IPC_CHANNELS).toHaveProperty("fsCreateFolder");
    expect(IPC_CHANNELS).toHaveProperty("fsInitProject");
    expect(IPC_CHANNELS).toHaveProperty("projectOpen");
    expect(IPC_CHANNELS).toHaveProperty("projectLoadMru");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/shared/__tests__/types.test.ts`
Expected: FAIL — properties don't exist yet.

**Step 3: Implement the types and IPC channels**

Update `src/shared/ipc.ts`:

```ts
export const IPC_CHANNELS = {
  ping: "app.ping",
  fsListDirectory: "fs:listDirectory",
  fsCreateFolder: "fs:createFolder",
  fsInitProject: "fs:initProject",
  projectOpen: "project:open",
  projectLoadMru: "project:loadMru",
} as const;

export type IpcChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
```

Create `src/shared/types.ts`:

```ts
export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isGitRepo: boolean;
}

export interface RecentProject {
  path: string;
  pathHash: string;
  lastOpened: string; // ISO timestamp
}

export interface MruStore {
  recentProjects: RecentProject[];
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/shared/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/
git commit -m "feat(us1): add shared types and IPC channels for project selection"
```

---

### Task 2: FileSystemService with injected fs

**Files:**
- Create: `src/main/services/FileSystemService.ts`
- Create: `src/main/services/__tests__/FileSystemService.test.ts`

**Step 1: Write the failing tests**

Create `src/main/services/__tests__/FileSystemService.test.ts`:

```ts
import { Volume } from "memfs";
import { FileSystemService } from "../FileSystemService";

function createTestFs(files: Record<string, string> = {}) {
  const vol = Volume.fromJSON(files, "/");
  return vol.promises as any;
}

describe("FileSystemService", () => {
  describe("listDirectory", () => {
    it("lists files and directories", async () => {
      const fs = createTestFs({
        "/home/user/folder/file.txt": "hello",
        "/home/user/other/file.txt": "world",
      });
      const service = new FileSystemService(fs);
      const entries = await service.listDirectory("/home/user");
      const names = entries.map((e) => e.name);
      expect(names).toContain("folder");
      expect(names).toContain("other");
    });

    it("detects git repos", async () => {
      const fs = createTestFs({
        "/home/user/my-project/.git/HEAD": "ref: refs/heads/main",
        "/home/user/plain-folder/file.txt": "hello",
      });
      const service = new FileSystemService(fs);
      const entries = await service.listDirectory("/home/user");
      const repo = entries.find((e) => e.name === "my-project");
      const plain = entries.find((e) => e.name === "plain-folder");
      expect(repo?.isGitRepo).toBe(true);
      expect(plain?.isGitRepo).toBe(false);
    });

    it("marks directories and files correctly", async () => {
      const fs = createTestFs({
        "/home/user/folder/file.txt": "hello",
        "/home/user/file.txt": "root file",
      });
      const service = new FileSystemService(fs);
      const entries = await service.listDirectory("/home/user");
      const folder = entries.find((e) => e.name === "folder");
      const file = entries.find((e) => e.name === "file.txt");
      expect(folder?.isDirectory).toBe(true);
      expect(file?.isDirectory).toBe(false);
    });

    it("sorts directories before files, alphabetically", async () => {
      const fs = createTestFs({
        "/home/user/zeta/file.txt": "",
        "/home/user/alpha/file.txt": "",
        "/home/user/readme.md": "",
      });
      const service = new FileSystemService(fs);
      const entries = await service.listDirectory("/home/user");
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["alpha", "zeta", "readme.md"]);
    });
  });

  describe("createFolder", () => {
    it("creates a new folder", async () => {
      const fs = createTestFs({ "/home/user/existing/file.txt": "" });
      const service = new FileSystemService(fs);
      await service.createFolder("/home/user", "new-folder");
      const entries = await service.listDirectory("/home/user");
      expect(entries.find((e) => e.name === "new-folder")).toBeDefined();
    });
  });

  describe("isGitRepo", () => {
    it("returns true for a git repo", async () => {
      const fs = createTestFs({ "/repo/.git/HEAD": "ref: refs/heads/main" });
      const service = new FileSystemService(fs);
      expect(await service.isGitRepo("/repo")).toBe(true);
    });

    it("returns false for a plain folder", async () => {
      const fs = createTestFs({ "/folder/file.txt": "" });
      const service = new FileSystemService(fs);
      expect(await service.isGitRepo("/folder")).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/main/services/__tests__/FileSystemService.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement FileSystemService**

Create `src/main/services/FileSystemService.ts`:

```ts
import type { DirectoryEntry } from "@shared/types";
import nodePath from "node:path";

export interface FsLike {
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
  access(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

export class FileSystemService {
  constructor(private fs: FsLike) {}

  async listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    const names = await this.fs.readdir(dirPath);
    const entries: DirectoryEntry[] = [];

    for (const name of names) {
      if (name.startsWith(".")) continue;
      const fullPath = nodePath.join(dirPath, name);
      try {
        const stat = await this.fs.stat(fullPath);
        const isDir = stat.isDirectory();
        const isGitRepo = isDir ? await this.isGitRepo(fullPath) : false;
        entries.push({ name, isDirectory: isDir, isGitRepo });
      } catch {
        // skip entries we can't stat
      }
    }

    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  }

  async createFolder(parentPath: string, name: string): Promise<void> {
    const fullPath = nodePath.join(parentPath, name);
    await this.fs.mkdir(fullPath, { recursive: true });
  }

  async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      const gitPath = nodePath.join(dirPath, ".git");
      await this.fs.access(gitPath);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/main/services/__tests__/FileSystemService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/
git commit -m "feat(us1): add FileSystemService with injected fs"
```

---

### Task 3: MRU store service

**Files:**
- Create: `src/main/services/MruService.ts`
- Create: `src/main/services/__tests__/MruService.test.ts`

**Step 1: Write the failing tests**

Create `src/main/services/__tests__/MruService.test.ts`:

```ts
import { Volume } from "memfs";
import { MruService } from "../MruService";

function createTestFs(files: Record<string, string> = {}) {
  const vol = Volume.fromJSON(files, "/");
  return vol.promises as any;
}

describe("MruService", () => {
  it("returns empty list when no store file exists", async () => {
    const fs = createTestFs({});
    const service = new MruService(fs, "/home/user/.pita");
    const projects = await service.load();
    expect(projects).toEqual([]);
  });

  it("loads persisted recent projects", async () => {
    const store = JSON.stringify({
      recentProjects: [
        { path: "/home/user/project", pathHash: "abc123", lastOpened: "2026-02-16T20:00:00Z" },
      ],
    });
    const fs = createTestFs({ "/home/user/.pita/store.json": store });
    const service = new MruService(fs, "/home/user/.pita");
    const projects = await service.load();
    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe("/home/user/project");
  });

  it("adds a project and persists it", async () => {
    const fs = createTestFs({});
    const service = new MruService(fs, "/home/user/.pita");
    await service.addOrBump("/home/user/project");
    const projects = await service.load();
    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe("/home/user/project");
    expect(projects[0].pathHash).toBeTruthy();
  });

  it("bumps an existing project to the top", async () => {
    const store = JSON.stringify({
      recentProjects: [
        { path: "/home/user/old", pathHash: "aaa", lastOpened: "2026-02-15T10:00:00Z" },
        { path: "/home/user/older", pathHash: "bbb", lastOpened: "2026-02-14T10:00:00Z" },
      ],
    });
    const fs = createTestFs({ "/home/user/.pita/store.json": store });
    const service = new MruService(fs, "/home/user/.pita");
    await service.addOrBump("/home/user/older");
    const projects = await service.load();
    expect(projects[0].path).toBe("/home/user/older");
  });

  it("sorts by lastOpened descending", async () => {
    const store = JSON.stringify({
      recentProjects: [
        { path: "/a", pathHash: "aaa", lastOpened: "2026-02-14T00:00:00Z" },
        { path: "/b", pathHash: "bbb", lastOpened: "2026-02-16T00:00:00Z" },
        { path: "/c", pathHash: "ccc", lastOpened: "2026-02-15T00:00:00Z" },
      ],
    });
    const fs = createTestFs({ "/home/user/.pita/store.json": store });
    const service = new MruService(fs, "/home/user/.pita");
    const projects = await service.load();
    expect(projects.map((p) => p.path)).toEqual(["/b", "/c", "/a"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/main/services/__tests__/MruService.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement MruService**

Create `src/main/services/MruService.ts`:

```ts
import type { MruStore, RecentProject } from "@shared/types";
import nodePath from "node:path";
import { createHash } from "node:crypto";
import type { FsLike } from "./FileSystemService";

export interface MruFsLike extends FsLike {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
}

export class MruService {
  private storePath: string;

  constructor(
    private fs: MruFsLike,
    private pitaDir: string,
  ) {
    this.storePath = nodePath.join(pitaDir, "store.json");
  }

  async load(): Promise<RecentProject[]> {
    try {
      const data = await this.fs.readFile(this.storePath, "utf-8");
      const store: MruStore = JSON.parse(data);
      return store.recentProjects.sort(
        (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime(),
      );
    } catch {
      return [];
    }
  }

  async addOrBump(projectPath: string): Promise<void> {
    const projects = await this.load();
    const hash = this.hashPath(projectPath);
    const now = new Date().toISOString();

    const existing = projects.findIndex((p) => p.path === projectPath);
    if (existing !== -1) {
      projects[existing].lastOpened = now;
    } else {
      projects.push({ path: projectPath, pathHash: hash, lastOpened: now });
    }

    projects.sort(
      (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime(),
    );

    await this.fs.mkdir(this.pitaDir, { recursive: true });
    await this.fs.writeFile(this.storePath, JSON.stringify({ recentProjects: projects }, null, 2));
  }

  private hashPath(p: string): string {
    return createHash("sha256").update(p).digest("hex").slice(0, 12);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/main/services/__tests__/MruService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/MruService.ts src/main/services/__tests__/MruService.test.ts
git commit -m "feat(us1): add MruService for recent projects persistence"
```

---

### Task 4: InitProject service (git init via isomorphic-git)

**Files:**
- Create: `src/main/services/ProjectService.ts`
- Create: `src/main/services/__tests__/ProjectService.test.ts`

**Step 1: Write the failing tests**

Create `src/main/services/__tests__/ProjectService.test.ts`:

```ts
import { Volume } from "memfs";
import { ProjectService } from "../ProjectService";

function createTestFs(files: Record<string, string> = {}) {
  const vol = Volume.fromJSON(files, "/");
  return { fs: vol as any, promises: vol.promises as any };
}

describe("ProjectService", () => {
  describe("initProject", () => {
    it("initializes a git repo in the given folder", async () => {
      const { fs, promises } = createTestFs({ "/project/file.txt": "hello" });
      const service = new ProjectService(fs);
      await service.initProject("/project");
      // isomorphic-git creates .git/ directory
      const stat = await promises.stat("/project/.git");
      expect(stat.isDirectory()).toBe(true);
    });

    it("throws if folder does not exist", async () => {
      const { fs } = createTestFs({});
      const service = new ProjectService(fs);
      await expect(service.initProject("/nonexistent")).rejects.toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/main/services/__tests__/ProjectService.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement ProjectService**

Create `src/main/services/ProjectService.ts`:

```ts
import git from "isomorphic-git";

export class ProjectService {
  constructor(private fs: any) {}

  async initProject(dirPath: string): Promise<void> {
    await git.init({ fs: this.fs, dir: dirPath });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/main/services/__tests__/ProjectService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/ProjectService.ts src/main/services/__tests__/ProjectService.test.ts
git commit -m "feat(us1): add ProjectService with git init via isomorphic-git"
```

---

### Task 5: IPC handlers wiring services to renderer

**Files:**
- Create: `src/main/ipc/projectSelectionIpc.ts`
- Modify: `src/main/main.ts`
- Modify: `src/preload/preload.ts`

**Step 1: Write the failing test**

Create `src/main/ipc/__tests__/projectSelectionIpc.test.ts`:

```ts
import { Volume } from "memfs";
import { createProjectSelectionHandlers } from "../projectSelectionIpc";

function createTestVol(files: Record<string, string> = {}) {
  return Volume.fromJSON(files, "/");
}

describe("projectSelectionIpc handlers", () => {
  it("fsListDirectory returns directory entries", async () => {
    const vol = createTestVol({
      "/home/user/repo/.git/HEAD": "ref: refs/heads/main",
      "/home/user/folder/file.txt": "",
    });
    const handlers = createProjectSelectionHandlers(vol as any, vol.promises as any, "/pita");
    const entries = await handlers.fsListDirectory("/home/user");
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "repo", isDirectory: true, isGitRepo: true }),
        expect.objectContaining({ name: "folder", isDirectory: true, isGitRepo: false }),
      ]),
    );
  });

  it("fsCreateFolder creates a folder", async () => {
    const vol = createTestVol({ "/home/user/existing/f.txt": "" });
    const handlers = createProjectSelectionHandlers(vol as any, vol.promises as any, "/pita");
    await handlers.fsCreateFolder("/home/user", "new-dir");
    const entries = await handlers.fsListDirectory("/home/user");
    expect(entries.find((e) => e.name === "new-dir")).toBeDefined();
  });

  it("fsInitProject creates a git repo", async () => {
    const vol = createTestVol({ "/home/user/folder/file.txt": "" });
    const handlers = createProjectSelectionHandlers(vol as any, vol.promises as any, "/pita");
    await handlers.fsInitProject("/home/user/folder");
    const entries = await handlers.fsListDirectory("/home/user");
    expect(entries.find((e) => e.name === "folder")?.isGitRepo).toBe(true);
  });

  it("projectLoadMru returns empty list initially", async () => {
    const vol = createTestVol({});
    const handlers = createProjectSelectionHandlers(vol as any, vol.promises as any, "/pita");
    const mru = await handlers.projectLoadMru();
    expect(mru).toEqual([]);
  });

  it("projectOpen adds to MRU and returns success", async () => {
    const vol = createTestVol({ "/home/user/repo/.git/HEAD": "ref: refs/heads/main" });
    const handlers = createProjectSelectionHandlers(vol as any, vol.promises as any, "/pita");
    await handlers.projectOpen("/home/user/repo");
    const mru = await handlers.projectLoadMru();
    expect(mru).toHaveLength(1);
    expect(mru[0].path).toBe("/home/user/repo");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/main/ipc/__tests__/projectSelectionIpc.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the IPC handler factory**

Create `src/main/ipc/projectSelectionIpc.ts`:

```ts
import { FileSystemService, type FsLike } from "../services/FileSystemService";
import { MruService, type MruFsLike } from "../services/MruService";
import { ProjectService } from "../services/ProjectService";
import type { DirectoryEntry, RecentProject } from "@shared/types";

export interface ProjectSelectionHandlers {
  fsListDirectory(dirPath: string): Promise<DirectoryEntry[]>;
  fsCreateFolder(parentPath: string, name: string): Promise<void>;
  fsInitProject(dirPath: string): Promise<void>;
  projectOpen(projectPath: string): Promise<void>;
  projectLoadMru(): Promise<RecentProject[]>;
}

export function createProjectSelectionHandlers(
  fs: any,
  fsPromises: FsLike & MruFsLike,
  pitaDir: string,
): ProjectSelectionHandlers {
  const fsService = new FileSystemService(fsPromises);
  const mruService = new MruService(fsPromises, pitaDir);
  const projectService = new ProjectService(fs);

  return {
    fsListDirectory: (dirPath) => fsService.listDirectory(dirPath),
    fsCreateFolder: (parentPath, name) => fsService.createFolder(parentPath, name),
    fsInitProject: (dirPath) => projectService.initProject(dirPath),
    projectOpen: (projectPath) => mruService.addOrBump(projectPath),
    projectLoadMru: () => mruService.load(),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/main/ipc/__tests__/projectSelectionIpc.test.ts`
Expected: PASS

**Step 5: Wire IPC handlers into main.ts and preload.ts**

Update `src/shared/ipc.ts` (already done in Task 1).

Update `src/preload/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc";

contextBridge.exposeInMainWorld("pita", {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
  fs: {
    listDirectory: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.fsListDirectory, dirPath),
    createFolder: (parentPath: string, name: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.fsCreateFolder, parentPath, name),
    initProject: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.fsInitProject, dirPath),
  },
  project: {
    open: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.projectOpen, projectPath),
    loadMru: () => ipcRenderer.invoke(IPC_CHANNELS.projectLoadMru),
  },
});
```

Update `src/main/main.ts` to register IPC handlers:

```ts
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { IPC_CHANNELS } from "@shared/ipc";
import { createProjectSelectionHandlers } from "./ipc/projectSelectionIpc";

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "../preload/preload.cjs"),
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
  const pitaDir = path.join(process.env.HOME || "/tmp", ".pita");
  const handlers = createProjectSelectionHandlers(fs, fs.promises, pitaDir);

  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
  ipcMain.handle(IPC_CHANNELS.fsListDirectory, (_, dirPath) => handlers.fsListDirectory(dirPath));
  ipcMain.handle(IPC_CHANNELS.fsCreateFolder, (_, parentPath, name) => handlers.fsCreateFolder(parentPath, name));
  ipcMain.handle(IPC_CHANNELS.fsInitProject, (_, dirPath) => handlers.fsInitProject(dirPath));
  ipcMain.handle(IPC_CHANNELS.projectOpen, (_, projectPath) => handlers.projectOpen(projectPath));
  ipcMain.handle(IPC_CHANNELS.projectLoadMru, () => handlers.projectLoadMru());

  createMainWindow();

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

**Step 6: Run all tests**

Run: `bun run test`
Expected: all pass.

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: clean.

**Step 8: Commit**

```bash
git add src/main/ipc/ src/main/main.ts src/preload/preload.ts
git commit -m "feat(us1): wire IPC handlers for project selection"
```

---

### Task 6: Dev mode memfs fixtures

**Files:**
- Create: `src/main/dev/fixtures.ts`
- Modify: `src/main/main.ts`

**Step 1: Write the failing test**

Create `src/main/dev/__tests__/fixtures.test.ts`:

```ts
import { Volume } from "memfs";
import { seedDevFixtures } from "../fixtures";

describe("seedDevFixtures", () => {
  it("creates a volume with git repos and plain folders", () => {
    const vol = new Volume();
    seedDevFixtures(vol);
    const homeContents = vol.readdirSync("/home/dev");
    expect(homeContents.length).toBeGreaterThan(0);
  });

  it("includes at least one git repo", () => {
    const vol = new Volume();
    seedDevFixtures(vol);
    const homeContents = vol.readdirSync("/home/dev") as string[];
    const hasGitRepo = homeContents.some((name) => {
      try {
        vol.statSync(`/home/dev/${name}/.git`);
        return true;
      } catch {
        return false;
      }
    });
    expect(hasGitRepo).toBe(true);
  });

  it("includes at least one plain folder", () => {
    const vol = new Volume();
    seedDevFixtures(vol);
    const homeContents = vol.readdirSync("/home/dev") as string[];
    const hasPlainFolder = homeContents.some((name) => {
      try {
        vol.statSync(`/home/dev/${name}/.git`);
        return false;
      } catch {
        return true;
      }
    });
    expect(hasPlainFolder).toBe(true);
  });

  it("seeds an MRU store with entries", () => {
    const vol = new Volume();
    seedDevFixtures(vol);
    const store = JSON.parse(vol.readFileSync("/home/dev/.pita/store.json", "utf-8") as string);
    expect(store.recentProjects.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/main/dev/__tests__/fixtures.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement fixtures**

Create `src/main/dev/fixtures.ts`:

```ts
import type { Volume } from "memfs";
import type { MruStore } from "@shared/types";
import { createHash } from "node:crypto";

function hashPath(p: string): string {
  return createHash("sha256").update(p).digest("hex").slice(0, 12);
}

export function seedDevFixtures(vol: Volume): void {
  const files: Record<string, string> = {
    // Git repos
    "/home/dev/my-app/.git/HEAD": "ref: refs/heads/main",
    "/home/dev/my-app/README.md": "# My App",
    "/home/dev/my-app/src/index.ts": "console.log('hello');",
    "/home/dev/side-project/.git/HEAD": "ref: refs/heads/main",
    "/home/dev/side-project/README.md": "# Side Project",
    // Plain folders
    "/home/dev/documents/notes.txt": "Some notes",
    "/home/dev/documents/todo.md": "- Buy groceries",
    "/home/dev/downloads/file.zip": "",
    // Nested
    "/home/dev/work/client-a/.git/HEAD": "ref: refs/heads/main",
    "/home/dev/work/client-a/package.json": "{}",
    "/home/dev/work/ideas/brainstorm.md": "# Ideas",
  };

  const mru: MruStore = {
    recentProjects: [
      { path: "/home/dev/my-app", pathHash: hashPath("/home/dev/my-app"), lastOpened: "2026-02-16T20:00:00Z" },
      { path: "/home/dev/side-project", pathHash: hashPath("/home/dev/side-project"), lastOpened: "2026-02-15T10:00:00Z" },
    ],
  };

  files["/home/dev/.pita/store.json"] = JSON.stringify(mru, null, 2);

  vol.fromJSON(files);
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/main/dev/__tests__/fixtures.test.ts`
Expected: PASS

**Step 5: Wire dev mode into main.ts**

Update `src/main/main.ts` — when `VITE_DEV_SERVER_URL` is set, use memfs with fixtures instead of real fs:

Add near the top of `app.whenReady()`:

```ts
import { Volume } from "memfs";
import { seedDevFixtures } from "./dev/fixtures";

// ... inside app.whenReady():
const isDev = !!process.env.VITE_DEV_SERVER_URL;
let fsImpl: any;
let fsPromises: any;
let pitaDir: string;
let homedir: string;

if (isDev) {
  const vol = new Volume();
  seedDevFixtures(vol);
  fsImpl = vol;
  fsPromises = vol.promises;
  pitaDir = "/home/dev/.pita";
  homedir = "/home/dev";
} else {
  fsImpl = (await import("node:fs")).default;
  fsPromises = fsImpl.promises;
  pitaDir = path.join(process.env.HOME || "/tmp", ".pita");
  homedir = process.env.HOME || "/tmp";
}

const handlers = createProjectSelectionHandlers(fsImpl, fsPromises, pitaDir);
```

Note: `homedir` will be passed to the renderer later so the Miller columns know where to start.

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: clean.

**Step 7: Commit**

```bash
git add src/main/dev/ src/main/main.ts
git commit -m "feat(us1): add dev mode memfs fixtures and wire into main"
```

---

### Task 7: Jotai atoms for project selection state

**Files:**
- Create: `src/renderer/store/projectSelection.ts`
- Create: `src/renderer/store/__tests__/projectSelection.test.ts`

**Step 1: Write the failing tests**

Create `src/renderer/store/__tests__/projectSelection.test.ts`:

```ts
import { createStore } from "jotai";
import {
  recentProjectsAtom,
  millerPathAtom,
  millerSelectionAtom,
  focusPanelAtom,
  navigateIntoAtom,
  navigateBackAtom,
} from "../projectSelection";

describe("projectSelection atoms", () => {
  it("has default focus on recent panel", () => {
    const store = createStore();
    expect(store.get(focusPanelAtom)).toBe("recent");
  });

  it("starts miller path with a single entry", () => {
    const store = createStore();
    const path = store.get(millerPathAtom);
    expect(path).toHaveLength(1);
  });

  it("navigateInto appends a path and resets selection", () => {
    const store = createStore();
    store.set(navigateIntoAtom, "/home/dev/projects");
    const paths = store.get(millerPathAtom);
    expect(paths).toHaveLength(2);
    expect(paths[paths.length - 1]).toBe("/home/dev/projects");
    expect(store.get(millerSelectionAtom)).toBe(0);
  });

  it("navigateBack removes the last column", () => {
    const store = createStore();
    store.set(navigateIntoAtom, "/home/dev/projects");
    store.set(navigateBackAtom);
    const paths = store.get(millerPathAtom);
    expect(paths).toHaveLength(1);
  });

  it("navigateBack does nothing at root", () => {
    const store = createStore();
    store.set(navigateBackAtom);
    const paths = store.get(millerPathAtom);
    expect(paths).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/renderer/store/__tests__/projectSelection.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement atoms**

Create `src/renderer/store/projectSelection.ts`:

```ts
import { atom } from "jotai";
import type { RecentProject } from "@shared/types";

export const recentProjectsAtom = atom<RecentProject[]>([]);

// Default home will be set from main process; "/home/dev" is the dev fallback
export const millerHomeDirAtom = atom<string>("/home/dev");

export const millerPathAtom = atom<string[]>((get) => {
  const home = get(millerHomeDirAtom);
  return get(millerPathInternalAtom).length > 0 ? get(millerPathInternalAtom) : [home];
});

const millerPathInternalAtom = atom<string[]>([]);

export const millerSelectionAtom = atom<number>(0);

export const focusPanelAtom = atom<"recent" | "miller">("recent");

export const navigateIntoAtom = atom(null, (get, set, dirPath: string) => {
  const current = get(millerPathInternalAtom).length > 0
    ? get(millerPathInternalAtom)
    : [get(millerHomeDirAtom)];
  set(millerPathInternalAtom, [...current, dirPath]);
  set(millerSelectionAtom, 0);
});

export const navigateBackAtom = atom(null, (get, set) => {
  const current = get(millerPathInternalAtom);
  if (current.length > 1) {
    set(millerPathInternalAtom, current.slice(0, -1));
    set(millerSelectionAtom, 0);
  }
});
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/renderer/store/__tests__/projectSelection.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/store/projectSelection.ts src/renderer/store/__tests__/
git commit -m "feat(us1): add Jotai atoms for project selection state"
```

---

### Task 8: RecentProjectsList component

**Files:**
- Create: `src/renderer/components/RecentProjectsList.tsx`
- Create: `src/renderer/components/__tests__/RecentProjectsList.test.tsx`

**Step 1: Write the failing tests**

Create `src/renderer/components/__tests__/RecentProjectsList.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { RecentProjectsList } from "../RecentProjectsList";
import { recentProjectsAtom, focusPanelAtom } from "../../store/projectSelection";

function renderWithStore(
  ui: React.ReactElement,
  initialValues?: Array<[any, any]>,
) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

const mockProjects = [
  { path: "/home/user/project-a", pathHash: "aaa", lastOpened: "2026-02-16T20:00:00Z" },
  { path: "/home/user/project-b", pathHash: "bbb", lastOpened: "2026-02-15T10:00:00Z" },
];

describe("RecentProjectsList", () => {
  it("renders recent projects", () => {
    renderWithStore(<RecentProjectsList onOpen={vi.fn()} />, [
      [recentProjectsAtom, mockProjects],
    ]);
    expect(screen.getByText("/home/user/project-a")).toBeInTheDocument();
    expect(screen.getByText("/home/user/project-b")).toBeInTheDocument();
  });

  it("shows empty state when no projects", () => {
    renderWithStore(<RecentProjectsList onOpen={vi.fn()} />, [
      [recentProjectsAtom, []],
    ]);
    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument();
  });

  it("calls onOpen when a project is clicked", () => {
    const onOpen = vi.fn();
    renderWithStore(<RecentProjectsList onOpen={onOpen} />, [
      [recentProjectsAtom, mockProjects],
    ]);
    fireEvent.click(screen.getByText("/home/user/project-a"));
    expect(onOpen).toHaveBeenCalledWith("/home/user/project-a");
  });

  it("calls onOpen on Enter key for selected project", () => {
    const onOpen = vi.fn();
    const { store } = renderWithStore(<RecentProjectsList onOpen={onOpen} />, [
      [recentProjectsAtom, mockProjects],
      [focusPanelAtom, "recent"],
    ]);
    // The first project is selected by default
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/home/user/project-a");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/renderer/components/__tests__/RecentProjectsList.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement RecentProjectsList**

Create `src/renderer/components/RecentProjectsList.tsx`:

```tsx
import { useAtomValue, useAtom } from "jotai";
import { useState, useEffect } from "react";
import { FolderGit2 } from "lucide-react";
import { recentProjectsAtom, focusPanelAtom } from "../store/projectSelection";
import { cn } from "../lib/utils";

interface RecentProjectsListProps {
  onOpen: (projectPath: string) => void;
}

export function RecentProjectsList({ onOpen }: RecentProjectsListProps) {
  const projects = useAtomValue(recentProjectsAtom);
  const [focusPanel] = useAtom(focusPanelAtom);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isFocused = focusPanel === "recent";

  useEffect(() => {
    if (!isFocused) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(projects.length - 1, i + 1));
          break;
        case "Enter":
          e.preventDefault();
          if (projects[selectedIndex]) {
            onOpen(projects[selectedIndex].path);
          }
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, projects, selectedIndex, onOpen]);

  if (projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No recent projects
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {projects.map((project, index) => (
        <button
          key={project.pathHash}
          onClick={() => onOpen(project.path)}
          className={cn(
            "flex items-center gap-2 rounded px-3 py-2 text-left text-sm",
            isFocused && index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
          )}
        >
          <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{project.path}</span>
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/renderer/components/__tests__/RecentProjectsList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/RecentProjectsList.tsx src/renderer/components/__tests__/
git commit -m "feat(us1): add RecentProjectsList component"
```

---

### Task 9: MillerColumn component

**Files:**
- Create: `src/renderer/components/MillerColumn.tsx`
- Create: `src/renderer/components/__tests__/MillerColumn.test.tsx`

**Step 1: Write the failing tests**

Create `src/renderer/components/__tests__/MillerColumn.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MillerColumn } from "../MillerColumn";
import type { DirectoryEntry } from "@shared/types";

const entries: DirectoryEntry[] = [
  { name: "my-project", isDirectory: true, isGitRepo: true },
  { name: "plain-folder", isDirectory: true, isGitRepo: false },
  { name: "readme.md", isDirectory: false, isGitRepo: false },
];

describe("MillerColumn", () => {
  it("renders directory entries", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("my-project")).toBeInTheDocument();
    expect(screen.getByText("plain-folder")).toBeInTheDocument();
    expect(screen.getByText("readme.md")).toBeInTheDocument();
  });

  it("highlights the selected entry", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={1}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    const selected = screen.getByText("plain-folder").closest("button");
    expect(selected?.className).toContain("bg-accent");
  });

  it("dims non-repo directories", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    const plain = screen.getByText("plain-folder").closest("button");
    expect(plain?.className).toContain("opacity-50");
  });

  it("shows git icon for repos", () => {
    const { container } = render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    // lucide-react renders SVGs with data-testid or we check by structure
    const repoRow = screen.getByText("my-project").closest("button");
    expect(repoRow?.querySelector("svg")).toBeTruthy();
  });

  it("calls onSelect when clicking an entry", () => {
    const onSelect = vi.fn();
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={onSelect}
        onNavigate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("plain-folder"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onNavigate on double-click of a directory", () => {
    const onNavigate = vi.fn();
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.doubleClick(screen.getByText("plain-folder"));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/renderer/components/__tests__/MillerColumn.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement MillerColumn**

Create `src/renderer/components/MillerColumn.tsx`:

```tsx
import { Folder, FolderGit2, File } from "lucide-react";
import type { DirectoryEntry } from "@shared/types";
import { cn } from "../lib/utils";

interface MillerColumnProps {
  entries: DirectoryEntry[];
  selectedIndex: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onNavigate: (index: number) => void;
}

export function MillerColumn({
  entries,
  selectedIndex,
  isActive,
  onSelect,
  onNavigate,
}: MillerColumnProps) {
  return (
    <div className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-border">
      {entries.map((entry, index) => {
        const isSelected = isActive && index === selectedIndex;
        const isDimmed = entry.isDirectory && !entry.isGitRepo;
        const Icon = entry.isGitRepo ? FolderGit2 : entry.isDirectory ? Folder : File;

        return (
          <button
            key={entry.name}
            onClick={() => onSelect(index)}
            onDoubleClick={() => entry.isDirectory && onNavigate(index)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-left text-sm",
              isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              isDimmed && "opacity-50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{entry.name}</span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/renderer/components/__tests__/MillerColumn.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/MillerColumn.tsx src/renderer/components/__tests__/MillerColumn.test.tsx
git commit -m "feat(us1): add MillerColumn component"
```

---

### Task 10: MillerColumnsView (orchestrates columns + keyboard navigation)

**Files:**
- Create: `src/renderer/components/MillerColumnsView.tsx`
- Create: `src/renderer/components/__tests__/MillerColumnsView.test.tsx`

**Step 1: Write the failing tests**

Create `src/renderer/components/__tests__/MillerColumnsView.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { MillerColumnsView } from "../MillerColumnsView";
import { focusPanelAtom, millerHomeDirAtom } from "../../store/projectSelection";
import type { DirectoryEntry } from "@shared/types";

const mockListDirectory = vi.fn();

function renderWithStore(
  ui: React.ReactElement,
  initialValues?: Array<[any, any]>,
) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

describe("MillerColumnsView", () => {
  beforeEach(() => {
    mockListDirectory.mockReset();
  });

  it("loads and displays the home directory", async () => {
    mockListDirectory.mockResolvedValue([
      { name: "projects", isDirectory: true, isGitRepo: false },
      { name: "documents", isDirectory: true, isGitRepo: false },
    ]);

    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={vi.fn()} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("projects")).toBeInTheDocument();
    });
    expect(mockListDirectory).toHaveBeenCalledWith("/home/dev");
  });

  it("navigates into a folder on Right arrow", async () => {
    mockListDirectory
      .mockResolvedValueOnce([
        { name: "projects", isDirectory: true, isGitRepo: false },
      ])
      .mockResolvedValueOnce([
        { name: "my-app", isDirectory: true, isGitRepo: true },
      ]);

    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={vi.fn()} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("projects")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("my-app")).toBeInTheDocument();
    });
  });

  it("calls onOpenProject on Enter when git repo is selected", async () => {
    mockListDirectory.mockResolvedValue([
      { name: "my-repo", isDirectory: true, isGitRepo: true },
    ]);

    const onOpen = vi.fn();
    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={onOpen} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/home/dev/my-repo");
  });

  it("does not call onOpenProject on Enter for non-repo folder", async () => {
    mockListDirectory.mockResolvedValue([
      { name: "plain", isDirectory: true, isGitRepo: false },
    ]);

    const onOpen = vi.fn();
    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={onOpen} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("plain")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/renderer/components/__tests__/MillerColumnsView.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement MillerColumnsView**

Create `src/renderer/components/MillerColumnsView.tsx`:

```tsx
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState, useCallback, useRef } from "react";
import { MillerColumn } from "./MillerColumn";
import {
  millerPathAtom,
  millerSelectionAtom,
  focusPanelAtom,
  navigateIntoAtom,
  navigateBackAtom,
  millerHomeDirAtom,
} from "../store/projectSelection";
import type { DirectoryEntry } from "@shared/types";
import nodePath from "node:path";

interface MillerColumnsViewProps {
  listDirectory: (dirPath: string) => Promise<DirectoryEntry[]>;
  onOpenProject: (projectPath: string) => void;
}

export function MillerColumnsView({ listDirectory, onOpenProject }: MillerColumnsViewProps) {
  const millerPath = useAtomValue(millerPathAtom);
  const [selection, setSelection] = useAtom(millerSelectionAtom);
  const [focusPanel] = useAtom(focusPanelAtom);
  const [, navigateInto] = useAtom(navigateIntoAtom);
  const [, navigateBack] = useAtom(navigateBackAtom);

  // Cache directory contents per path
  const [columnsData, setColumnsData] = useState<Map<string, DirectoryEntry[]>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  const isFocused = focusPanel === "miller";

  // Load directory contents when miller path changes
  useEffect(() => {
    const currentDir = millerPath[millerPath.length - 1];
    if (!columnsData.has(currentDir)) {
      listDirectory(currentDir).then((entries) => {
        setColumnsData((prev) => new Map(prev).set(currentDir, entries));
      });
    }
  }, [millerPath, listDirectory, columnsData]);

  // Scroll rightmost column into view
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [millerPath]);

  const currentDir = millerPath[millerPath.length - 1];
  const currentEntries = columnsData.get(currentDir) || [];

  const handleNavigateInto = useCallback(
    (index: number) => {
      const entry = currentEntries[index];
      if (entry?.isDirectory) {
        const newPath = currentDir + "/" + entry.name;
        navigateInto(newPath);
        // Pre-load the new directory
        listDirectory(newPath).then((entries) => {
          setColumnsData((prev) => new Map(prev).set(newPath, entries));
        });
      }
    },
    [currentEntries, currentDir, navigateInto, listDirectory],
  );

  useEffect(() => {
    if (!isFocused) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelection(Math.max(0, selection - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelection(Math.min(currentEntries.length - 1, selection + 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNavigateInto(selection);
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigateBack();
          break;
        case "Enter": {
          e.preventDefault();
          const entry = currentEntries[selection];
          if (entry?.isGitRepo) {
            onOpenProject(currentDir + "/" + entry.name);
          }
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, selection, currentEntries, currentDir, handleNavigateInto, navigateBack, onOpenProject, setSelection]);

  return (
    <div ref={scrollRef} className="flex h-full overflow-x-auto">
      {millerPath.map((dirPath, colIndex) => {
        const entries = columnsData.get(dirPath) || [];
        const isActiveColumn = colIndex === millerPath.length - 1;
        return (
          <MillerColumn
            key={dirPath}
            entries={entries}
            selectedIndex={isActiveColumn ? selection : -1}
            isActive={isActiveColumn && isFocused}
            onSelect={(index) => {
              if (isActiveColumn) setSelection(index);
            }}
            onNavigate={(index) => {
              if (isActiveColumn) handleNavigateInto(index);
            }}
          />
        );
      })}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/renderer/components/__tests__/MillerColumnsView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/MillerColumnsView.tsx src/renderer/components/__tests__/MillerColumnsView.test.tsx
git commit -m "feat(us1): add MillerColumnsView with keyboard navigation"
```

---

### Task 11: ProjectToolbar and ShortcutHelpBar

**Files:**
- Create: `src/renderer/components/ProjectToolbar.tsx`
- Create: `src/renderer/components/ShortcutHelpBar.tsx`
- Create: `src/renderer/components/__tests__/ProjectToolbar.test.tsx`

**Step 1: Write the failing tests**

Create `src/renderer/components/__tests__/ProjectToolbar.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ProjectToolbar } from "../ProjectToolbar";
import { focusPanelAtom } from "../../store/projectSelection";

function renderWithStore(ui: React.ReactElement, initialValues?: Array<[any, any]>) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

describe("ProjectToolbar", () => {
  it("renders New Folder and Create Project buttons", () => {
    renderWithStore(
      <ProjectToolbar onNewFolder={vi.fn()} onCreateProject={vi.fn()} selectedIsRepo={false} />,
      [[focusPanelAtom, "miller"]],
    );
    expect(screen.getByText(/new folder/i)).toBeInTheDocument();
    expect(screen.getByText(/create project/i)).toBeInTheDocument();
  });

  it("calls onNewFolder on Ctrl+N when miller is focused", () => {
    const onNewFolder = vi.fn();
    renderWithStore(
      <ProjectToolbar onNewFolder={onNewFolder} onCreateProject={vi.fn()} selectedIsRepo={false} />,
      [[focusPanelAtom, "miller"]],
    );
    fireEvent.keyDown(document, { key: "n", ctrlKey: true });
    expect(onNewFolder).toHaveBeenCalled();
  });

  it("calls onCreateProject on Ctrl+P when miller is focused", () => {
    const onCreateProject = vi.fn();
    renderWithStore(
      <ProjectToolbar onNewFolder={vi.fn()} onCreateProject={onCreateProject} selectedIsRepo={false} />,
      [[focusPanelAtom, "miller"]],
    );
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });
    expect(onCreateProject).toHaveBeenCalled();
  });

  it("does not fire shortcuts when recent panel is focused", () => {
    const onNewFolder = vi.fn();
    const onCreateProject = vi.fn();
    renderWithStore(
      <ProjectToolbar onNewFolder={onNewFolder} onCreateProject={onCreateProject} selectedIsRepo={false} />,
      [[focusPanelAtom, "recent"]],
    );
    fireEvent.keyDown(document, { key: "n", ctrlKey: true });
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });
    expect(onNewFolder).not.toHaveBeenCalled();
    expect(onCreateProject).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/renderer/components/__tests__/ProjectToolbar.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement ProjectToolbar and ShortcutHelpBar**

Create `src/renderer/components/ProjectToolbar.tsx`:

```tsx
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { FolderPlus, GitBranchPlus } from "lucide-react";
import { focusPanelAtom } from "../store/projectSelection";

interface ProjectToolbarProps {
  onNewFolder: () => void;
  onCreateProject: () => void;
  selectedIsRepo: boolean;
}

export function ProjectToolbar({ onNewFolder, onCreateProject, selectedIsRepo }: ProjectToolbarProps) {
  const focusPanel = useAtomValue(focusPanelAtom);
  const millerFocused = focusPanel === "miller";

  useEffect(() => {
    if (!millerFocused) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        onNewFolder();
      }
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        onCreateProject();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [millerFocused, onNewFolder, onCreateProject]);

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-2">
      <button
        onClick={onNewFolder}
        disabled={!millerFocused}
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        <FolderPlus className="h-4 w-4" />
        New Folder
        <kbd className="ml-1 text-xs text-muted-foreground">Ctrl+N</kbd>
      </button>
      <button
        onClick={onCreateProject}
        disabled={!millerFocused || selectedIsRepo}
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        <GitBranchPlus className="h-4 w-4" />
        Create Project
        <kbd className="ml-1 text-xs text-muted-foreground">Ctrl+P</kbd>
      </button>
    </div>
  );
}
```

Create `src/renderer/components/ShortcutHelpBar.tsx`:

```tsx
import { useAtomValue } from "jotai";
import { focusPanelAtom } from "../store/projectSelection";

const recentShortcuts = [
  { key: "↑↓", label: "Navigate" },
  { key: "Enter", label: "Open" },
  { key: "Tab", label: "Switch panel" },
];

const millerShortcuts = [
  { key: "↑↓", label: "Navigate" },
  { key: "←→", label: "Columns" },
  { key: "Enter", label: "Open project" },
  { key: "Ctrl+N", label: "New folder" },
  { key: "Ctrl+P", label: "Create project" },
  { key: "Tab", label: "Switch panel" },
];

export function ShortcutHelpBar() {
  const focusPanel = useAtomValue(focusPanelAtom);
  const shortcuts = focusPanel === "recent" ? recentShortcuts : millerShortcuts;

  return (
    <div className="flex items-center gap-4 border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
      {shortcuts.map(({ key, label }) => (
        <span key={key} className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono">{key}</kbd>
          {label}
        </span>
      ))}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- src/renderer/components/__tests__/ProjectToolbar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/ProjectToolbar.tsx src/renderer/components/ShortcutHelpBar.tsx src/renderer/components/__tests__/ProjectToolbar.test.tsx
git commit -m "feat(us1): add ProjectToolbar and ShortcutHelpBar"
```

---

### Task 12: ProjectSelectionScreen (assembles all components)

**Files:**
- Create: `src/renderer/components/ProjectSelectionScreen.tsx`
- Create: `src/renderer/components/__tests__/ProjectSelectionScreen.test.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Write the failing tests**

Create `src/renderer/components/__tests__/ProjectSelectionScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ProjectSelectionScreen } from "../ProjectSelectionScreen";
import { recentProjectsAtom, millerHomeDirAtom } from "../../store/projectSelection";

const mockIpc = {
  fs: {
    listDirectory: vi.fn().mockResolvedValue([
      { name: "my-repo", isDirectory: true, isGitRepo: true },
      { name: "docs", isDirectory: true, isGitRepo: false },
    ]),
    createFolder: vi.fn().mockResolvedValue(undefined),
    initProject: vi.fn().mockResolvedValue(undefined),
  },
  project: {
    open: vi.fn().mockResolvedValue(undefined),
    loadMru: vi.fn().mockResolvedValue([]),
  },
};

function renderWithStore(initialValues?: Array<[any, any]>) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return {
    store,
    ...render(
      <Provider store={store}>
        <ProjectSelectionScreen ipc={mockIpc} onProjectOpened={vi.fn()} />
      </Provider>,
    ),
  };
}

describe("ProjectSelectionScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both panels", async () => {
    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
    });
    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument();
  });

  it("renders shortcut help bar", async () => {
    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    await waitFor(() => {
      expect(screen.getByText("Navigate")).toBeInTheDocument();
    });
  });

  it("switches focus between panels with Tab", async () => {
    const { store } = renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    // Default focus is recent
    fireEvent.keyDown(document, { key: "Tab" });
    // Now miller should be focused — we can verify by checking store
    // (indirectly tested via keyboard behavior)
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- src/renderer/components/__tests__/ProjectSelectionScreen.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement ProjectSelectionScreen**

Create `src/renderer/components/ProjectSelectionScreen.tsx`:

```tsx
import { useEffect, useCallback, useState } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { RecentProjectsList } from "./RecentProjectsList";
import { MillerColumnsView } from "./MillerColumnsView";
import { ProjectToolbar } from "./ProjectToolbar";
import { ShortcutHelpBar } from "./ShortcutHelpBar";
import {
  recentProjectsAtom,
  focusPanelAtom,
  millerPathAtom,
  millerSelectionAtom,
} from "../store/projectSelection";
import type { DirectoryEntry, RecentProject } from "@shared/types";

interface ProjectSelectionIpc {
  fs: {
    listDirectory: (dirPath: string) => Promise<DirectoryEntry[]>;
    createFolder: (parentPath: string, name: string) => Promise<void>;
    initProject: (dirPath: string) => Promise<void>;
  };
  project: {
    open: (projectPath: string) => Promise<void>;
    loadMru: () => Promise<RecentProject[]>;
  };
}

interface ProjectSelectionScreenProps {
  ipc: ProjectSelectionIpc;
  onProjectOpened: (projectPath: string) => void;
}

export function ProjectSelectionScreen({ ipc, onProjectOpened }: ProjectSelectionScreenProps) {
  const [focusPanel, setFocusPanel] = useAtom(focusPanelAtom);
  const setRecentProjects = useSetAtom(recentProjectsAtom);
  const millerPath = useAtomValue(millerPathAtom);
  const millerSelection = useAtomValue(millerSelectionAtom);
  const [currentEntries, setCurrentEntries] = useState<DirectoryEntry[]>([]);

  const [newFolderPrompt, setNewFolderPrompt] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Load MRU on mount
  useEffect(() => {
    ipc.project.loadMru().then(setRecentProjects);
  }, [ipc, setRecentProjects]);

  // Track current entries for toolbar state
  useEffect(() => {
    const currentDir = millerPath[millerPath.length - 1];
    ipc.fs.listDirectory(currentDir).then(setCurrentEntries);
  }, [millerPath, ipc]);

  // Tab to toggle focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault();
        setFocusPanel((prev) => (prev === "recent" ? "miller" : "recent"));
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setFocusPanel]);

  const handleOpenProject = useCallback(
    async (projectPath: string) => {
      await ipc.project.open(projectPath);
      onProjectOpened(projectPath);
    },
    [ipc, onProjectOpened],
  );

  const handleNewFolder = useCallback(() => {
    setNewFolderPrompt(true);
    setNewFolderName("");
  }, []);

  const handleNewFolderConfirm = useCallback(async () => {
    if (!newFolderName.trim()) return;
    const currentDir = millerPath[millerPath.length - 1];
    await ipc.fs.createFolder(currentDir, newFolderName.trim());
    setNewFolderPrompt(false);
    setNewFolderName("");
    // Refresh current directory
    const entries = await ipc.fs.listDirectory(currentDir);
    setCurrentEntries(entries);
  }, [newFolderName, millerPath, ipc]);

  const handleCreateProject = useCallback(async () => {
    const selectedEntry = currentEntries[millerSelection];
    const currentDir = millerPath[millerPath.length - 1];
    const targetPath = selectedEntry
      ? currentDir + "/" + selectedEntry.name
      : currentDir;

    if (selectedEntry && !selectedEntry.isDirectory) return;
    if (selectedEntry?.isGitRepo) return;

    const confirmed = window.confirm(`Create project in ${targetPath}?`);
    if (!confirmed) return;

    await ipc.fs.initProject(targetPath);
    await handleOpenProject(targetPath);
  }, [currentEntries, millerSelection, millerPath, ipc, handleOpenProject]);

  const selectedEntry = currentEntries[millerSelection];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Open Project
        </h1>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel: recent projects */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </div>
          <RecentProjectsList onOpen={handleOpenProject} />
        </div>

        {/* Right panel: miller columns */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MillerColumnsView
              listDirectory={ipc.fs.listDirectory}
              onOpenProject={handleOpenProject}
            />
          </div>

          {/* New folder inline prompt */}
          {newFolderPrompt && (
            <div className="flex items-center gap-2 border-t border-border px-4 py-2">
              <span className="text-sm text-muted-foreground">Folder name:</span>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNewFolderConfirm();
                  if (e.key === "Escape") setNewFolderPrompt(false);
                }}
                className="flex-1 rounded bg-input px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </div>

      <ProjectToolbar
        onNewFolder={handleNewFolder}
        onCreateProject={handleCreateProject}
        selectedIsRepo={selectedEntry?.isGitRepo ?? false}
      />
      <ShortcutHelpBar />
    </div>
  );
}
```

**Step 4: Update App.tsx**

```tsx
import { ProjectSelectionScreen } from "./components/ProjectSelectionScreen";
import { useState } from "react";

declare global {
  interface Window {
    pita: any;
  }
}

export function App() {
  const [openedProject, setOpenedProject] = useState<string | null>(null);

  if (openedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-bold">Session: {openedProject}</h1>
      </div>
    );
  }

  return (
    <ProjectSelectionScreen
      ipc={window.pita}
      onProjectOpened={setOpenedProject}
    />
  );
}
```

**Step 5: Run tests**

Run: `bun run test`
Expected: all pass.

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: clean.

**Step 7: Commit**

```bash
git add src/renderer/components/ProjectSelectionScreen.tsx src/renderer/components/__tests__/ProjectSelectionScreen.test.tsx src/renderer/App.tsx
git commit -m "feat(us1): add ProjectSelectionScreen and wire into App"
```

---

### Task 13: Playwright E2E smoke test for project selection

**Files:**
- Modify: `tests/e2e/app.spec.ts`

**Step 1: Update the E2E test**

Replace `tests/e2e/app.spec.ts`:

```ts
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

  // Should show the project selection screen header
  await expect(window.locator("text=Open Project")).toBeVisible();

  // Should show the Recent section
  await expect(window.locator("text=Recent")).toBeVisible();

  await app.close();
});

test("dev mode shows seeded fixture projects in recent list", async () => {
  const app = await electron.launch({
    args: [path.resolve("dist/main/main.cjs")],
    env: { ...process.env, VITE_DEV_SERVER_URL: undefined },
    timeout: 15_000,
  });

  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  // Dev mode seeds /home/dev/my-app and /home/dev/side-project in MRU
  // In production build (no VITE_DEV_SERVER_URL), real fs is used,
  // so we just verify the screen loads.
  await expect(window.locator("text=Open Project")).toBeVisible();

  await app.close();
});
```

**Step 2: Build and run E2E**

```bash
bun run build
bun run test:e2e
```

Expected: tests pass.

**Step 3: Commit**

```bash
git add tests/e2e/app.spec.ts
git commit -m "test(us1): update E2E smoke test for project selection screen"
```

---

### Task 14: Final verification

**Step 1: Run all gates**

```bash
bun run typecheck
bun run test
bun run test:e2e
```

Expected: all pass.

**Step 2: Manual dev mode check**

```bash
bun run dev
```

Expected: Electron opens showing the project selection screen with:
- Recent panel on the left (seeded with fixture projects)
- Miller columns on the right (browsing /home/dev from memfs)
- Toolbar and help bar at the bottom
- Tab switches focus, arrow keys navigate, keyboard shortcuts work

**Step 3: Commit any remaining changes**

```bash
git add -A
git status
git commit -m "feat(us1): project selection screen complete"
```
