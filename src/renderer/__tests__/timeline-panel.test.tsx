import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelinePanel, type TimelineItem } from "../components/TimelinePanel";

describe("TimelinePanel", () => {
  it("renders user, assistant, and tool placeholder rows", () => {
    const items: TimelineItem[] = [
      { id: "1", role: "user", text: "User message" },
      { id: "2", role: "assistant", text: "Assistant message" },
      { id: "3", role: "tool", text: "Tool message" }
    ];

    render(<TimelinePanel items={items} />);

    expect(screen.getByText("user")).toBeTruthy();
    expect(screen.getByText("assistant")).toBeTruthy();
    expect(screen.getByText("tool")).toBeTruthy();
  });
});
