import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("App shell", () => {
  it("renders timeline and prompt composer", () => {
    render(<App />);

    expect(screen.getByTestId("timeline-panel")).toBeTruthy();
    expect(screen.getByTestId("prompt-composer-panel")).toBeTruthy();
  });
});
