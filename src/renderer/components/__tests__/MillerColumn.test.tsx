import { render, screen, fireEvent } from "@testing-library/react";
import { MillerColumn } from "../MillerColumn";
import type { DirectoryEntry } from "@shared/types";

const entries: DirectoryEntry[] = [
  { name: "my-project", isDirectory: true, isGitRepo: true },
  { name: "plain-folder", isDirectory: true, isGitRepo: false },
  { name: "readme.md", isDirectory: false, isGitRepo: false },
];

describe("MillerColumn", () => {
  it("renders directory entries", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("my-project")).toBeInTheDocument();
    expect(screen.getByText("plain-folder")).toBeInTheDocument();
    expect(screen.getByText("readme.md")).toBeInTheDocument();
  });

  it("highlights the selected entry", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={1}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    const selected = screen.getByText("plain-folder").closest("button");
    expect(selected?.className).toContain("bg-accent");
  });

  it("dims non-repo directories", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    const plain = screen.getByText("plain-folder").closest("button");
    expect(plain?.className).toContain("opacity-50");
  });

  it("shows icon for repo entries", () => {
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    const repoRow = screen.getByText("my-project").closest("button");
    expect(repoRow?.querySelector("svg")).toBeTruthy();
  });

  it("calls onSelect when clicking an entry", () => {
    const onSelect = vi.fn();
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={onSelect}
        onNavigate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("plain-folder"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onNavigate on double-click of a directory", () => {
    const onNavigate = vi.fn();
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.doubleClick(screen.getByText("plain-folder"));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("does not navigate on double-click for files", () => {
    const onNavigate = vi.fn();
    render(
      <MillerColumn
        entries={entries}
        selectedIndex={0}
        isActive={true}
        onSelect={vi.fn()}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.doubleClick(screen.getByText("readme.md"));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
