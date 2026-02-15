import { useEffect } from "react";
import type { Command } from "../commands/registry";
import { useAtom } from "../store";
import { paletteOpenAtom } from "../store/atoms";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

interface CommandPaletteProps {
  commands: Command[];
}

export function CommandPalette({ commands }: CommandPaletteProps): JSX.Element {
  const [open, setOpen] = useAtom(paletteOpenAtom);

  useEffect(() => {
    const down = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
    };
  }, [setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Actions">
          {commands.map((command) => (
            <CommandItem
              key={command.id}
              keywords={command.keywords}
              onSelect={() => {
                try {
                  command.execute();
                } catch (error) {
                  console.error("Command execution failed:", error);
                }
                setOpen(false);
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{command.label}</span>
                {command.description ? (
                  <span className="text-sm text-muted-foreground">{command.description}</span>
                ) : null}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
