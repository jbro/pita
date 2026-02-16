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
