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
