import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "jotai";
import { App } from "./App";
import { store } from "./store";
import styles from "./styles.css?raw";

function mountStyles(css: string): HTMLStyleElement {
  const styleElement = document.createElement("style");
  styleElement.setAttribute("data-pita-styles", "renderer");
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
  return styleElement;
}

async function loadStylesFromDirect(): Promise<string> {
  const response = await fetch(`/src/renderer/styles.css?direct&t=${Date.now()}`);
  return response.text();
}

const styleElement = mountStyles(styles);

if (!styles.trim()) {
  void loadStylesFromDirect().then((css) => {
    styleElement.textContent = css;
  });
}

if (import.meta.hot) {
  import.meta.hot.accept("./styles.css?raw", (nextModule) => {
    const nextCss = nextModule?.default ?? "";

    if (nextCss.trim()) {
      styleElement.textContent = nextCss;
      return;
    }

    void loadStylesFromDirect().then((css) => {
      styleElement.textContent = css;
    });
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
