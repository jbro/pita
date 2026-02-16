import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ProjectSelectionScreen } from "../ProjectSelectionScreen";
import { focusPanelAtom, millerHomeDirAtom } from "../../store/projectSelection";

const mockIpc = {
  app: {
    getHomeDir: vi.fn().mockResolvedValue("/home/dev"),
  },
  fs: {
    listDirectory: vi.fn().mockResolvedValue([
      { name: "my-repo", isDirectory: true, isGitRepo: true },
      { name: "docs", isDirectory: true, isGitRepo: false },
    ]),
    createFolder: vi.fn().mockResolvedValue(undefined),
    initProject: vi.fn().mockResolvedValue(undefined),
  },
  project: {
    open: vi.fn().mockResolvedValue(undefined),
    loadMru: vi.fn().mockResolvedValue([]),
  },
};

function renderWithStore(
  initialValues?: Array<[any, any]>,
  onProjectOpened: (path: string) => void = vi.fn(),
) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));

  return {
    store,
    onProjectOpened,
    ...render(
      <Provider store={store}>
        <ProjectSelectionScreen ipc={mockIpc} onProjectOpened={onProjectOpened} />
      </Provider>,
    ),
  };
}

describe("ProjectSelectionScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpc.fs.listDirectory.mockResolvedValue([
      { name: "my-repo", isDirectory: true, isGitRepo: true },
      { name: "docs", isDirectory: true, isGitRepo: false },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders both panels", async () => {
    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
    });
    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument();
  });

  it("renders shortcut help bar", async () => {
    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    await waitFor(() => {
      expect(screen.getByText("Navigate")).toBeInTheDocument();
    });
  });

  it("switches focus between panels with Tab", async () => {
    const { store } = renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
    });

    expect(store.get(focusPanelAtom)).toBe("recent");

    await act(async () => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    expect(store.get(focusPanelAtom)).toBe("miller");

    await act(async () => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    expect(store.get(focusPanelAtom)).toBe("recent");
  });

  it("asks for confirmation before creating a project", async () => {
    mockIpc.fs.listDirectory.mockResolvedValue([
      { name: "plain", isDirectory: true, isGitRepo: false },
    ]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);
    await waitFor(() => {
      expect(screen.getByText("plain")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Tab" });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(confirmSpy).toHaveBeenCalledWith("Create project in /home/dev/plain?");
    expect(mockIpc.fs.initProject).not.toHaveBeenCalled();
  });

  it("dismisses new-folder prompt on Escape", async () => {
    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);

    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Tab" });
    fireEvent.click(screen.getByRole("button", { name: /new folder/i }));

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("creates a new folder and calls fs.createFolder", async () => {
    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);

    await waitFor(() => {
      expect(screen.getByText("docs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /new folder/i }));
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "new-sandbox" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockIpc.fs.createFolder).toHaveBeenCalledWith("/home/dev", "new-sandbox");
    });
    expect(screen.getByText("Folder created: new-sandbox")).toBeInTheDocument();
  });

  it("creates a project from selected non-git folder and opens it", async () => {
    mockIpc.fs.listDirectory.mockResolvedValue([
      { name: "documents", isDirectory: true, isGitRepo: false },
    ]);
    const onProjectOpened = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithStore([[millerHomeDirAtom, "/home/dev"]], onProjectOpened);

    await waitFor(() => {
      expect(screen.getByText("documents")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("documents"));
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(mockIpc.fs.initProject).toHaveBeenCalledWith("/home/dev/documents");
      expect(mockIpc.project.open).toHaveBeenCalledWith("/home/dev/documents");
      expect(onProjectOpened).toHaveBeenCalledWith("/home/dev/documents");
    });
  });

  it("shows status when trying to open a non-git folder", async () => {
    mockIpc.fs.listDirectory.mockResolvedValue([
      { name: "documents", isDirectory: true, isGitRepo: false },
    ]);

    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);

    await waitFor(() => {
      expect(screen.getByText("documents")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("documents"));
    fireEvent.keyDown(document, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Selected folder is not a git project. Use Create Project.")).toBeInTheDocument();
    });
  });

  it("navigates deeply nested directories forward and backward repeatedly", async () => {
    const map: Record<string, Array<{ name: string; isDirectory: boolean; isGitRepo: boolean }>> = {
      "/home/dev": [{ name: "deep", isDirectory: true, isGitRepo: false }],
      "/home/dev/deep": [{ name: "level-1", isDirectory: true, isGitRepo: false }],
      "/home/dev/deep/level-1": [
        { name: "level-2", isDirectory: true, isGitRepo: false },
        { name: "side-a", isDirectory: true, isGitRepo: false },
      ],
      "/home/dev/deep/level-1/level-2": [
        { name: "level-3", isDirectory: true, isGitRepo: false },
        { name: "side-b", isDirectory: true, isGitRepo: false },
      ],
      "/home/dev/deep/level-1/level-2/level-3": [
        { name: "level-4", isDirectory: true, isGitRepo: false },
      ],
      "/home/dev/deep/level-1/level-2/level-3/level-4": [
        { name: "level-5", isDirectory: true, isGitRepo: false },
      ],
      "/home/dev/deep/level-1/level-2/level-3/level-4/level-5": [
        { name: "level-6", isDirectory: true, isGitRepo: true },
      ],
      "/home/dev/deep/level-1/level-2/level-3/level-4/level-5/level-6": [],
    };

    mockIpc.fs.listDirectory.mockImplementation(async (dirPath: string) => map[dirPath] ?? []);

    renderWithStore([[millerHomeDirAtom, "/home/dev"]]);

    await waitFor(() => {
      expect(screen.getByText("deep")).toBeInTheDocument();
    });

    fireEvent.dblClick(screen.getByText("deep"));
    await waitFor(() => expect(screen.getByText("level-1")).toBeInTheDocument());

    fireEvent.dblClick(screen.getByText("level-1"));
    await waitFor(() => expect(screen.getByText("level-2")).toBeInTheDocument());

    fireEvent.dblClick(screen.getByText("level-2"));
    await waitFor(() => expect(screen.getByText("level-3")).toBeInTheDocument());

    fireEvent.dblClick(screen.getByText("level-3"));
    await waitFor(() => expect(screen.getByText("level-4")).toBeInTheDocument());

    fireEvent.dblClick(screen.getByText("level-4"));
    await waitFor(() => expect(screen.getByText("level-5")).toBeInTheDocument());

    // Navigate back up repeatedly
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByText("side-a")).toBeInTheDocument();
      expect(screen.getByText("level-2")).toBeInTheDocument();
    });
  });
});
