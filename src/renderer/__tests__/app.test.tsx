import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { App } from "../App";
import { store } from "../store";

describe("App", () => {
  it("renders the project selection screen", async () => {
    window.pita = {
      app: { getHomeDir: async () => "/home/dev" },
      fs: {
        listDirectory: async () => [],
        createFolder: async () => {},
        initProject: async () => {},
      },
      project: {
        open: async () => {},
        loadMru: async () => [],
      },
    };

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(await screen.findByText("Open Project")).toBeInTheDocument();
  });
});
