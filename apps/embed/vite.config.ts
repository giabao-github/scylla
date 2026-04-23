import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "embed.ts"),
      name: "ScyllaWidget",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      "@workspace/shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
  server: {
    port: 3002,
    open: "/demo.html",
  },
});
