import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [devtools({ autoname: true }), solidPlugin()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: ["solid-icons", "solid-js", "@solidjs/router"],
  },
  build: {
    target: "esnext",
  },
});
