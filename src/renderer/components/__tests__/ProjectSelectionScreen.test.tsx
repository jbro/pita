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

function renderWithStore(initialValues?: Array<[any, any]>) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));

  return {
    store,
    ...render(
      <Provider store={store}>
        <ProjectSelectionScreen ipc={mockIpc} onProjectOpened={vi.fn()} />
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
});
