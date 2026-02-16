import { useAtomValue } from "jotai";
import { focusPanelAtom } from "../store/projectSelection";

const recentShortcuts = [
  { key: "↑↓", label: "Navigate" },
  { key: "Enter", label: "Open" },
  { key: "Tab", label: "Switch panel" },
];

const millerShortcuts = [
  { key: "↑↓", label: "Navigate" },
  { key: "←→", label: "Columns" },
  { key: "Enter", label: "Open project" },
  { key: "Ctrl+N", label: "New folder" },
  { key: "Ctrl+P", label: "Create project" },
  { key: "Tab", label: "Switch panel" },
];

export function ShortcutHelpBar() {
  const focusPanel = useAtomValue(focusPanelAtom);
  const shortcuts = focusPanel === "recent" ? recentShortcuts : millerShortcuts;

  return (
    <div className="flex items-center gap-4 border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
      {shortcuts.map(({ key, label }) => (
        <span key={`${key}-${label}`} className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono">{key}</kbd>
          {label}
        </span>
      ))}
    </div>
  );
}
