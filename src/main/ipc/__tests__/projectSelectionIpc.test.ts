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
