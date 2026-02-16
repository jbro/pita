import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { FolderPlus, GitBranchPlus } from "lucide-react";
import { focusPanelAtom } from "../store/projectSelection";

interface ProjectToolbarProps {
  onNewFolder: () => void;
  onCreateProject: () => void;
  selectedIsRepo: boolean;
}

export function ProjectToolbar({ onNewFolder, onCreateProject, selectedIsRepo }: ProjectToolbarProps) {
  const focusPanel = useAtomValue(focusPanelAtom);
  const millerFocused = focusPanel === "miller";

  useEffect(() => {
    if (!millerFocused) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewFolder();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        onCreateProject();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [millerFocused, onNewFolder, onCreateProject]);

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-2">
      <button
        type="button"
        onClick={onNewFolder}
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        <FolderPlus className="h-4 w-4" />
        New Folder
        <kbd className="ml-1 text-xs text-muted-foreground">Ctrl+N</kbd>
      </button>
      <button
        type="button"
        onClick={onCreateProject}
        disabled={selectedIsRepo}
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        <GitBranchPlus className="h-4 w-4" />
        Create Project
        <kbd className="ml-1 text-xs text-muted-foreground">Ctrl+P</kbd>
      </button>
    </div>
  );
}
