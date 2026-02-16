import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DirectoryEntry } from "@shared/types";
import { MillerColumn } from "./MillerColumn";
import {
  focusPanelAtom,
  millerPathAtom,
  millerSelectionAtom,
  navigateBackAtom,
  navigateIntoAtom,
} from "../store/projectSelection";

interface MillerColumnsViewProps {
  listDirectory: (dirPath: string) => Promise<DirectoryEntry[]>;
  onOpenProject: (projectPath: string) => void;
}

function joinPath(base: string, name: string): string {
  return `${base.replace(/\/+$/, "")}/${name}`;
}

export function MillerColumnsView({ listDirectory, onOpenProject }: MillerColumnsViewProps) {
  const millerPath = useAtomValue(millerPathAtom);
  const [selection, setSelection] = useAtom(millerSelectionAtom);
  const focusPanel = useAtomValue(focusPanelAtom);
  const [, navigateInto] = useAtom(navigateIntoAtom);
  const [, navigateBack] = useAtom(navigateBackAtom);

  const [columnsData, setColumnsData] = useState<Map<string, DirectoryEntry[]>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  const isFocused = focusPanel === "miller";
  const currentDir = millerPath[millerPath.length - 1];
  const currentEntries = useMemo(() => columnsData.get(currentDir) ?? [], [columnsData, currentDir]);

  useEffect(() => {
    const missing = millerPath.filter((dirPath) => !columnsData.has(dirPath));
    if (missing.length === 0) return;

    let cancelled = false;

    Promise.all(missing.map(async (dirPath) => [dirPath, await listDirectory(dirPath)] as const)).then(
      (results) => {
        if (cancelled) return;
        setColumnsData((prev) => {
          const next = new Map(prev);
          for (const [dirPath, entries] of results) next.set(dirPath, entries);
          return next;
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [millerPath, columnsData, listDirectory]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [millerPath]);

  const handleNavigateInto = useCallback(
    (index: number) => {
      const entry = currentEntries[index];
      if (!entry?.isDirectory) return;
      navigateInto(joinPath(currentDir, entry.name));
    },
    [currentDir, currentEntries, navigateInto],
  );

  useEffect(() => {
    if (!isFocused) return;

    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelection((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelection((prev) => Math.min(currentEntries.length - 1, prev + 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNavigateInto(selection);
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigateBack();
          break;
        case "Enter": {
          e.preventDefault();
          const entry = currentEntries[selection];
          if (entry?.isGitRepo) {
            onOpenProject(joinPath(currentDir, entry.name));
          }
          break;
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    isFocused,
    currentEntries,
    selection,
    handleNavigateInto,
    navigateBack,
    onOpenProject,
    currentDir,
    setSelection,
  ]);

  return (
    <div ref={scrollRef} className="flex h-full overflow-x-auto">
      {millerPath.map((dirPath, index) => {
        const entries = columnsData.get(dirPath) ?? [];
        const isActiveColumn = index === millerPath.length - 1;

        return (
          <MillerColumn
            key={dirPath}
            entries={entries}
            selectedIndex={isActiveColumn ? selection : -1}
            isActive={isActiveColumn && isFocused}
            onSelect={(entryIndex) => {
              if (isActiveColumn) setSelection(entryIndex);
            }}
            onNavigate={(entryIndex) => {
              if (isActiveColumn) handleNavigateInto(entryIndex);
            }}
          />
        );
      })}
    </div>
  );
}
