import { atom } from "jotai";
import type { RecentProject } from "@shared/types";

export const recentProjectsAtom = atom<RecentProject[]>([]);

export const millerHomeDirAtom = atom<string>("/home/dev");

const millerPathInternalAtom = atom<string[]>([]);

export const millerPathAtom = atom<string[]>((get) => {
  const current = get(millerPathInternalAtom);
  if (current.length > 0) return current;
  return [get(millerHomeDirAtom)];
});

export const millerSelectionAtom = atom<number>(0);

export const focusPanelAtom = atom<"recent" | "miller">("recent");

export const navigateIntoAtom = atom(null, (get, set, dirPath: string) => {
  const current = get(millerPathAtom);
  set(millerPathInternalAtom, [...current, dirPath]);
  set(millerSelectionAtom, 0);
});

export const navigateBackAtom = atom(null, (get, set) => {
  const current = get(millerPathAtom);
  if (current.length > 1) {
    set(millerPathInternalAtom, current.slice(0, -1));
    set(millerSelectionAtom, 0);
  }
});
