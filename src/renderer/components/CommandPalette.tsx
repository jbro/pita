import { useEffect, useRef, type KeyboardEvent } from "react";
import Fuse from "fuse.js";
import type { Command } from "../commands/registry";
import { useAtom } from "../store";
import { paletteSearchQueryAtom, paletteSelectedIndexAtom } from "../store/atoms";

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
  const [searchQuery, setSearchQuery] = useAtom(paletteSearchQueryAtom);
  const [selectedIndex, setSelectedIndex] = useAtom(paletteSelectedIndexAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = new Fuse(commands, {
    keys: ["label", "description"],
    threshold: 0.3,
  });

  const filteredCommands =
    searchQuery.trim() === ""
      ? commands
      : fuse.search(searchQuery).map((result) => result.item);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (filteredCommands.length === 0) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev >= filteredCommands.length - 1 ? 0 : prev + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? filteredCommands.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (!selected) return;

      try {
        selected.execute();
      } catch (error) {
        console.error("Command execution failed:", error);
      }
      onClose();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, setSelectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      // Reset search and selection when palette closes
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, setSearchQuery, setSelectedIndex]);

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
          onKeyDown={handleKeyDown}
        />

        <div className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">No commands found</div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                type="button"
                className={`command-palette-item ${
                  index === selectedIndex ? "selected" : ""
                }`}
                onClick={() => {
                  try {
                    command.execute();
                  } catch (error) {
                    console.error("Command execution failed:", error);
                  }
                  onClose();
                }}
              >
                <div className="command-palette-item-label">{command.label}</div>
                {command.description && (
                  <div className="command-palette-item-description">
                    {command.description}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
