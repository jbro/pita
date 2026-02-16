import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { DirectoryEntry, RecentProject } from "@shared/types";
import { RecentProjectsList } from "./RecentProjectsList";
import { MillerColumnsView } from "./MillerColumnsView";
import { ProjectToolbar } from "./ProjectToolbar";
import { ShortcutHelpBar } from "./ShortcutHelpBar";
import {
  focusPanelAtom,
  millerPathAtom,
  millerSelectionAtom,
  recentProjectsAtom,
} from "../store/projectSelection";

interface ProjectSelectionIpc {
  fs: {
    listDirectory: (dirPath: string) => Promise<DirectoryEntry[]>;
    createFolder: (parentPath: string, name: string) => Promise<void>;
    initProject: (dirPath: string) => Promise<void>;
  };
  project: {
    open: (projectPath: string) => Promise<void>;
    loadMru: () => Promise<RecentProject[]>;
  };
}

interface ProjectSelectionScreenProps {
  ipc: ProjectSelectionIpc;
  onProjectOpened: (projectPath: string) => void;
}

function joinPath(base: string, name: string): string {
  return `${base.replace(/\/+$/, "")}/${name}`;
}

export function ProjectSelectionScreen({ ipc, onProjectOpened }: ProjectSelectionScreenProps) {
  const [focusPanel, setFocusPanel] = useAtom(focusPanelAtom);
  const setRecentProjects = useSetAtom(recentProjectsAtom);
  const millerPath = useAtomValue(millerPathAtom);
  const millerSelection = useAtomValue(millerSelectionAtom);

  const [currentEntries, setCurrentEntries] = useState<DirectoryEntry[]>([]);
  const [newFolderPrompt, setNewFolderPrompt] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    ipc.project.loadMru().then(setRecentProjects);
  }, [ipc, setRecentProjects]);

  useEffect(() => {
    const currentDir = millerPath[millerPath.length - 1];
    ipc.fs.listDirectory(currentDir).then(setCurrentEntries);
  }, [millerPath, ipc]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault();
        setFocusPanel((prev) => (prev === "recent" ? "miller" : "recent"));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setFocusPanel]);

  const handleOpenProject = useCallback(
    async (projectPath: string) => {
      await ipc.project.open(projectPath);
      onProjectOpened(projectPath);
    },
    [ipc, onProjectOpened],
  );

  const handleNewFolder = useCallback(() => {
    if (focusPanel !== "miller") return;
    setNewFolderPrompt(true);
    setNewFolderName("");
  }, [focusPanel]);

  const currentDir = millerPath[millerPath.length - 1];

  const handleNewFolderConfirm = useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    await ipc.fs.createFolder(currentDir, trimmed);
    setNewFolderPrompt(false);
    setNewFolderName("");
    const refreshed = await ipc.fs.listDirectory(currentDir);
    setCurrentEntries(refreshed);
  }, [newFolderName, ipc, currentDir]);

  const handleCreateProject = useCallback(async () => {
    if (focusPanel !== "miller") return;

    const selectedEntry = currentEntries[millerSelection];
    if (selectedEntry && !selectedEntry.isDirectory) return;
    if (selectedEntry?.isGitRepo) return;

    const targetPath = selectedEntry ? joinPath(currentDir, selectedEntry.name) : currentDir;
    const confirmed = window.confirm(`Create project in ${targetPath}?`);
    if (!confirmed) return;

    await ipc.fs.initProject(targetPath);
    await handleOpenProject(targetPath);
  }, [focusPanel, currentEntries, millerSelection, currentDir, ipc, handleOpenProject]);

  const selectedEntry = useMemo(() => currentEntries[millerSelection], [currentEntries, millerSelection]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Open Project</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="w-72 shrink-0 overflow-y-auto border-r border-border">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </div>
          <RecentProjectsList onOpen={handleOpenProject} />
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MillerColumnsView listDirectory={ipc.fs.listDirectory} onOpenProject={handleOpenProject} />
          </div>

          {newFolderPrompt && (
            <div className="flex items-center gap-2 border-t border-border px-4 py-2">
              <span className="text-sm text-muted-foreground">Folder name:</span>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleNewFolderConfirm();
                  if (e.key === "Escape") {
                    setNewFolderPrompt(false);
                    setNewFolderName("");
                  }
                }}
                className="flex-1 rounded bg-input px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </section>
      </div>

      <ProjectToolbar
        onNewFolder={handleNewFolder}
        onCreateProject={handleCreateProject}
        selectedIsRepo={selectedEntry?.isGitRepo ?? false}
      />
      <ShortcutHelpBar />
    </div>
  );
}
