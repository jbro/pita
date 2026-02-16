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
