import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";

describe("App shell", () => {
  it("renders timeline and prompt composer", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(screen.getByTestId("timeline-panel")).toBeTruthy();
    expect(screen.getByTestId("prompt-composer-panel")).toBeTruthy();
  });

  it("shows command palette shortcut hint in the header", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(screen.getByText("⌘K / Ctrl+K")).toBeTruthy();
  });
});
