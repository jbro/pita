import { useMemo, useState } from "react";
import { ProjectSelectionScreen } from "./components/ProjectSelectionScreen";

declare global {
  interface Window {
    pita?: any;
  }
}

export function App() {
  const [openedProject, setOpenedProject] = useState<string | null>(null);

  const ipc = useMemo(
    () =>
      window.pita ?? {
        app: {
          getHomeDir: async () => "/tmp",
        },
        fs: {
          listDirectory: async () => [],
          createFolder: async () => {},
          initProject: async () => {},
        },
        project: {
          open: async () => {},
          loadMru: async () => [],
        },
      },
    [],
  );

  if (openedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-bold">Session: {openedProject}</h1>
      </div>
    );
  }

  return <ProjectSelectionScreen ipc={ipc} onProjectOpened={setOpenedProject} />;
}
