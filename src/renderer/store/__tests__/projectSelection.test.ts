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

  it("recent projects defaults to empty", () => {
    const store = createStore();
    expect(store.get(recentProjectsAtom)).toEqual([]);
  });
});
