import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";

describe("App", () => {
  it("renders the app title", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText("Pita")).toBeInTheDocument();
  });
});
