import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { Command } from "../commands/registry";

interface CommandPaletteProps {
  isOpen: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({
  isOpen,
  commands,
  onClose,
}: CommandPaletteProps): JSX.Element | null {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = new Fuse(commands, {
    keys: ["label", "description"],
    threshold: 0.3,
  });

  const filteredCommands =
    searchQuery.trim() === ""
      ? commands
      : fuse.search(searchQuery).map((result) => result.item);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="command-palette-search"
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">No commands found</div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`command-palette-item ${
                  index === selectedIndex ? "selected" : ""
                }`}
              >
                <div className="command-palette-item-label">{command.label}</div>
                {command.description && (
                  <div className="command-palette-item-description">
                    {command.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
