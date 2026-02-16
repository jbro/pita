import { Folder, FolderGit2, File } from "lucide-react";
import type { DirectoryEntry } from "@shared/types";
import { cn } from "../lib/utils";

interface MillerColumnProps {
  entries: DirectoryEntry[];
  selectedIndex: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onNavigate: (index: number) => void;
}

export function MillerColumn({
  entries,
  selectedIndex,
  isActive,
  onSelect,
  onNavigate,
}: MillerColumnProps) {
  return (
    <div className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-border">
      {entries.map((entry, index) => {
        const isSelected = isActive && index === selectedIndex;
        const isDimmed = entry.isDirectory && !entry.isGitRepo;
        const Icon = entry.isGitRepo ? FolderGit2 : entry.isDirectory ? Folder : File;

        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onSelect(index)}
            onDoubleClick={() => {
              if (entry.isDirectory) onNavigate(index);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-left text-sm",
              isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              isDimmed && "opacity-50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{entry.name}</span>
          </button>
        );
      })}
    </div>
  );
}
