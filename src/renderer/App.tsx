import { useMemo, useState } from "react";
import { ProjectSelectionScreen } from "./components/ProjectSelectionScreen";

declare global {
  interface Window {
    pita?: any;
  }
}

export function App() {
  const [openedProject, setOpenedProject] = useState<string | null>(null);

  const ipc = useMemo(() => window.pita, []);

  if (!ipc) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        <p>IPC bridge unavailable. Restart the app.</p>
      </div>
    );
  }

  if (openedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-bold">Session: {openedProject}</h1>
      </div>
    );
  }

  return <ProjectSelectionScreen ipc={ipc} onProjectOpened={setOpenedProject} />;
}
