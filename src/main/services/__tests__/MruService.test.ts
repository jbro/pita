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
        {
          path: "/home/user/project",
          pathHash: "abc123",
          lastOpened: "2026-02-16T20:00:00Z",
        },
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
        {
          path: "/home/user/old",
          pathHash: "aaa",
          lastOpened: "2026-02-15T10:00:00Z",
        },
        {
          path: "/home/user/older",
          pathHash: "bbb",
          lastOpened: "2026-02-14T10:00:00Z",
        },
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
