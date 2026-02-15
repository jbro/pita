export interface Command {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  execute: () => void;
}

export interface CommandHandlers {
  clearTimeline: () => void;
  focusPrompt: () => void;
}

export function createCommandRegistry(handlers: CommandHandlers): Command[] {
  return [
    {
      id: "clear-timeline",
      label: "Clear Timeline",
      description: "Remove all timeline messages",
      keywords: ["clear", "delete", "remove", "timeline"],
      execute: handlers.clearTimeline,
    },
    {
      id: "focus-prompt",
      label: "Focus Prompt",
      description: "Focus the prompt input",
      keywords: ["focus", "prompt", "input", "cursor"],
      execute: handlers.focusPrompt,
    },
  ];
}
