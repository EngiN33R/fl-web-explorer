import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: resolve(__dirname, "public"),
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        navmap: resolve(__dirname, "navmap/index.html"),
      },
    },
  },
});
