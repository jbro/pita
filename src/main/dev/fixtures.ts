import type { Volume } from "memfs";
import type { MruStore } from "@shared/types";
import { createHash } from "node:crypto";

function hashPath(p: string): string {
  return createHash("sha256").update(p).digest("hex").slice(0, 12);
}

export function seedDevFixtures(vol: Volume): void {
  const files: Record<string, string> = {
    "/home/dev/my-app/.git/HEAD": "ref: refs/heads/main",
    "/home/dev/my-app/README.md": "# My App",
    "/home/dev/my-app/src/index.ts": "console.log('hello');",
    "/home/dev/side-project/.git/HEAD": "ref: refs/heads/main",
    "/home/dev/side-project/README.md": "# Side Project",
    "/home/dev/documents/notes.txt": "Some notes",
    "/home/dev/documents/todo.md": "- Buy groceries",
    "/home/dev/downloads/file.zip": "",
    "/home/dev/work/client-a/.git/HEAD": "ref: refs/heads/main",
    "/home/dev/work/client-a/package.json": "{}",
    "/home/dev/work/ideas/brainstorm.md": "# Ideas",
  };

  const mru: MruStore = {
    recentProjects: [
      {
        path: "/home/dev/my-app",
        pathHash: hashPath("/home/dev/my-app"),
        lastOpened: "2026-02-16T20:00:00Z",
      },
      {
        path: "/home/dev/side-project",
        pathHash: hashPath("/home/dev/side-project"),
        lastOpened: "2026-02-15T10:00:00Z",
      },
    ],
  };

  files["/home/dev/.pita/store.json"] = JSON.stringify(mru, null, 2);

  vol.fromJSON(files, "/");
}
