import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: false,
      quoteStyle: "double",
      semicolons: true,
    }),
    react(),
    tsconfigPaths(),
    wasm(),
    topLevelAwait(),
  ],
  server: {
    port: 5173,
    fs: {
      cachedChecks: false,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
