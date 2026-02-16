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
