import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    ssr: true,
    rollupOptions: {
      input: {
        "main/main": path.resolve(__dirname, "src/main/main.ts"),
        "preload/preload": path.resolve(__dirname, "src/preload/preload.ts"),
      },
      output: {
        entryFileNames: "[name].cjs",
        format: "cjs",
      },
      external: ["electron"],
    },
    target: "node22",
  },
});
