import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactElement } from "react";
import { ProjectToolbar } from "../ProjectToolbar";
import { focusPanelAtom } from "../../store/projectSelection";

function renderWithStore(ui: ReactElement, initialValues?: Array<[any, any]>) {
  const store = createStore();
  initialValues?.forEach(([atom, value]) => store.set(atom, value));
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

describe("ProjectToolbar", () => {
  it("renders New Folder and Create Project buttons", () => {
    renderWithStore(
      <ProjectToolbar onNewFolder={vi.fn()} onCreateProject={vi.fn()} selectedIsRepo={false} />,
      [[focusPanelAtom, "miller"]],
    );
    expect(screen.getByText(/new folder/i)).toBeInTheDocument();
    expect(screen.getByText(/create project/i)).toBeInTheDocument();
  });

  it("calls onNewFolder on Ctrl+N when miller is focused", () => {
    const onNewFolder = vi.fn();
    renderWithStore(
      <ProjectToolbar onNewFolder={onNewFolder} onCreateProject={vi.fn()} selectedIsRepo={false} />,
      [[focusPanelAtom, "miller"]],
    );
    fireEvent.keyDown(document, { key: "n", ctrlKey: true });
    expect(onNewFolder).toHaveBeenCalled();
  });

  it("calls onCreateProject on Ctrl+P when miller is focused", () => {
    const onCreateProject = vi.fn();
    renderWithStore(
      <ProjectToolbar onNewFolder={vi.fn()} onCreateProject={onCreateProject} selectedIsRepo={false} />,
      [[focusPanelAtom, "miller"]],
    );
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });
    expect(onCreateProject).toHaveBeenCalled();
  });

  it("does not fire shortcuts when recent panel is focused", () => {
    const onNewFolder = vi.fn();
    const onCreateProject = vi.fn();
    renderWithStore(
      <ProjectToolbar onNewFolder={onNewFolder} onCreateProject={onCreateProject} selectedIsRepo={false} />,
      [[focusPanelAtom, "recent"]],
    );
    fireEvent.keyDown(document, { key: "n", ctrlKey: true });
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });
    expect(onNewFolder).not.toHaveBeenCalled();
    expect(onCreateProject).not.toHaveBeenCalled();
  });
});
