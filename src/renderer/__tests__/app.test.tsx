import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";

describe("App", () => {
  it("renders the project selection screen", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText("Open Project")).toBeInTheDocument();
  });
});
