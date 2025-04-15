import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
