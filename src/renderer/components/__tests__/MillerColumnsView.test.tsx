import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactElement } from "react";
import { MillerColumnsView } from "../MillerColumnsView";
import { focusPanelAtom, millerHomeDirAtom } from "../../store/projectSelection";

const mockListDirectory = vi.fn();

function renderWithStore(
  ui: ReactElement,
  initialValues?: Array<[any, any]>,
) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

describe("MillerColumnsView", () => {
  beforeEach(() => {
    mockListDirectory.mockReset();
  });

  it("loads and displays the home directory", async () => {
    mockListDirectory.mockResolvedValue([
      { name: "projects", isDirectory: true, isGitRepo: false },
      { name: "documents", isDirectory: true, isGitRepo: false },
    ]);

    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={vi.fn()} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("projects")).toBeInTheDocument();
    });
    expect(mockListDirectory).toHaveBeenCalledWith("/home/dev");
  });

  it("navigates into a folder on Right arrow", async () => {
    mockListDirectory
      .mockResolvedValueOnce([{ name: "projects", isDirectory: true, isGitRepo: false }])
      .mockResolvedValueOnce([{ name: "my-app", isDirectory: true, isGitRepo: true }]);

    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={vi.fn()} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("projects")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("my-app")).toBeInTheDocument();
    });
  });

  it("calls onOpenProject on Enter when git repo is selected", async () => {
    mockListDirectory.mockResolvedValue([
      { name: "my-repo", isDirectory: true, isGitRepo: true },
    ]);

    const onOpen = vi.fn();
    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={onOpen} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("my-repo")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/home/dev/my-repo");
  });

  it("does not call onOpenProject on Enter for non-repo folder", async () => {
    mockListDirectory.mockResolvedValue([
      { name: "plain", isDirectory: true, isGitRepo: false },
    ]);

    const onOpen = vi.fn();
    renderWithStore(
      <MillerColumnsView listDirectory={mockListDirectory} onOpenProject={onOpen} />,
      [
        [focusPanelAtom, "miller"],
        [millerHomeDirAtom, "/home/dev"],
      ],
    );

    await waitFor(() => {
      expect(screen.getByText("plain")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
