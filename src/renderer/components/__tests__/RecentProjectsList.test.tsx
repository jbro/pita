import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactElement } from "react";
import { RecentProjectsList } from "../RecentProjectsList";
import { recentProjectsAtom, focusPanelAtom } from "../../store/projectSelection";

function renderWithStore(
  ui: ReactElement,
  initialValues?: Array<[any, any]>,
) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

const mockProjects = [
  { path: "/home/user/project-a", pathHash: "aaa", lastOpened: "2026-02-16T20:00:00Z" },
  { path: "/home/user/project-b", pathHash: "bbb", lastOpened: "2026-02-15T10:00:00Z" },
];

describe("RecentProjectsList", () => {
  it("renders recent projects", () => {
    renderWithStore(<RecentProjectsList onOpen={vi.fn()} />, [
      [recentProjectsAtom, mockProjects],
    ]);
    expect(screen.getByText("/home/user/project-a")).toBeInTheDocument();
    expect(screen.getByText("/home/user/project-b")).toBeInTheDocument();
  });

  it("shows empty state when no projects", () => {
    renderWithStore(<RecentProjectsList onOpen={vi.fn()} />, [
      [recentProjectsAtom, []],
    ]);
    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument();
  });

  it("calls onOpen when a project is clicked", () => {
    const onOpen = vi.fn();
    renderWithStore(<RecentProjectsList onOpen={onOpen} />, [
      [recentProjectsAtom, mockProjects],
    ]);
    fireEvent.click(screen.getByText("/home/user/project-a"));
    expect(onOpen).toHaveBeenCalledWith("/home/user/project-a");
  });

  it("calls onOpen on Enter key for selected project", () => {
    const onOpen = vi.fn();
    renderWithStore(<RecentProjectsList onOpen={onOpen} />, [
      [recentProjectsAtom, mockProjects],
      [focusPanelAtom, "recent"],
    ]);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/home/user/project-a");
  });

  it("does not react to keyboard when panel is not focused", () => {
    const onOpen = vi.fn();
    renderWithStore(<RecentProjectsList onOpen={onOpen} />, [
      [recentProjectsAtom, mockProjects],
      [focusPanelAtom, "miller"],
    ]);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
