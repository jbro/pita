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
