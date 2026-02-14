import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("App shell", () => {
  it("renders phase1 shell placeholders", () => {
    render(<App />);

    expect(screen.getByTestId("timeline-panel")).toBeTruthy();
    expect(screen.getByTestId("prompt-composer-panel")).toBeTruthy();
    expect(screen.getByTestId("command-palette-placeholder")).toBeTruthy();
  });
});
