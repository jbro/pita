import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { FolderGit2 } from "lucide-react";
import { recentProjectsAtom, focusPanelAtom } from "../store/projectSelection";
import { cn } from "../lib/utils";

interface RecentProjectsListProps {
  onOpen: (projectPath: string) => void;
}

export function RecentProjectsList({ onOpen }: RecentProjectsListProps) {
  const projects = useAtomValue(recentProjectsAtom);
  const focusPanel = useAtomValue(focusPanelAtom);
  const setFocusPanel = useSetAtom(focusPanelAtom);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isFocused = focusPanel === "recent";

  useEffect(() => {
    setSelectedIndex(0);
  }, [projects.length]);

  useEffect(() => {
    if (!isFocused) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (projects.length === 0) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(projects.length - 1, i + 1));
          break;
        case "Enter":
          e.preventDefault();
          if (projects[selectedIndex]) {
            onOpen(projects[selectedIndex].path);
          }
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, projects, selectedIndex, onOpen]);

  if (projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No recent projects
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {projects.map((project, index) => (
        <button
          key={project.pathHash}
          type="button"
          onClick={() => {
            setFocusPanel("recent");
            setSelectedIndex(index);
            onOpen(project.path);
          }}
          className={cn(
            "flex items-center gap-2 rounded px-3 py-2 text-left text-sm",
            isFocused && index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
          )}
        >
          <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{project.path}</span>
        </button>
      ))}
    </div>
  );
}
