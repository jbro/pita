import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { DirectoryEntry, RecentProject } from "@shared/types";
import { RecentProjectsList } from "./RecentProjectsList";
import { MillerColumnsView } from "./MillerColumnsView";
import { ProjectToolbar } from "./ProjectToolbar";
import { ShortcutHelpBar } from "./ShortcutHelpBar";
import {
  focusPanelAtom,
  millerHomeDirAtom,
  millerPathAtom,
  millerSelectionAtom,
  recentProjectsAtom,
} from "../store/projectSelection";

interface ProjectSelectionIpc {
  app?: {
    getHomeDir: () => Promise<string>;
  };
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
  const setMillerHomeDir = useSetAtom(millerHomeDirAtom);
  const millerPath = useAtomValue(millerPathAtom);
  const millerSelection = useAtomValue(millerSelectionAtom);

  const [currentEntries, setCurrentEntries] = useState<DirectoryEntry[]>([]);
  const [newFolderPrompt, setNewFolderPrompt] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [millerRefreshTick, setMillerRefreshTick] = useState(0);

  useEffect(() => {
    ipc.project.loadMru().then(setRecentProjects).catch(() => setRecentProjects([]));
  }, [ipc, setRecentProjects]);

  useEffect(() => {
    if (!ipc.app?.getHomeDir) return;
    ipc.app.getHomeDir().then(setMillerHomeDir).catch(() => undefined);
  }, [ipc, setMillerHomeDir]);

  useEffect(() => {
    const currentDir = millerPath[millerPath.length - 1];
    ipc.fs
      .listDirectory(currentDir)
      .then((entries) => {
        setCurrentEntries(entries);
        setStatusMessage(null);
      })
      .catch(() => {
        setCurrentEntries([]);
        setStatusMessage(`Unable to read directory: ${currentDir}`);
      });
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
    setFocusPanel("miller");
    setNewFolderPrompt(true);
    setNewFolderName("");
  }, [setFocusPanel]);

  const currentDir = millerPath[millerPath.length - 1];

  const handleNewFolderConfirm = useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    await ipc.fs.createFolder(currentDir, trimmed);
    setNewFolderPrompt(false);
    setNewFolderName("");
    setMillerRefreshTick((v) => v + 1);
    setStatusMessage(`Folder created: ${trimmed}`);
  }, [newFolderName, ipc, currentDir]);

  const handleCreateProject = useCallback(async () => {
    setFocusPanel("miller");

    const selectedEntry = currentEntries[millerSelection];
    if (selectedEntry && !selectedEntry.isDirectory) return;
    if (selectedEntry?.isGitRepo) return;

    const targetPath = selectedEntry ? joinPath(currentDir, selectedEntry.name) : currentDir;
    const confirmed = window.confirm(`Create project in ${targetPath}?`);
    if (!confirmed) return;

    try {
      await ipc.fs.initProject(targetPath);
      setMillerRefreshTick((v) => v + 1);
      await handleOpenProject(targetPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Failed to create project: ${message}`);
    }
  }, [setFocusPanel, currentEntries, millerSelection, currentDir, ipc, handleOpenProject]);

  const selectedEntry = useMemo(() => currentEntries[millerSelection], [currentEntries, millerSelection]);

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="flex h-[min(860px,92vh)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <header className="shrink-0 border-b border-border px-5 py-4">
          <h1 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Open Project</h1>
          {statusMessage && <p className="mt-2 text-xs text-muted-foreground">{statusMessage}</p>}
        </header>

        <div className="flex min-h-0 flex-1">
          <section
            className="w-72 shrink-0 overflow-y-auto border-r border-border"
            onClick={() => setFocusPanel("recent")}
          >
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent
            </div>
            <RecentProjectsList onOpen={handleOpenProject} />
          </section>

          <section
            className="flex min-w-0 flex-1 flex-col"
            onClick={() => setFocusPanel("miller")}
          >
            <div className="min-h-0 flex-1">
              <MillerColumnsView
                listDirectory={ipc.fs.listDirectory}
                onOpenProject={handleOpenProject}
                onInvalidOpen={setStatusMessage}
                refreshTick={millerRefreshTick}
              />
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
    </div>
  );
}
