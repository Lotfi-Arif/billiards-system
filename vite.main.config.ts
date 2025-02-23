import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": "/src",
      "@shared": "/src/shared",
      "@renderer": "/src/renderer",
      "@backend": "/src/backend",
    },
  },
  build: {
    rollupOptions: {
      external: ["better-sqlite3", "electron", "electron-squirrel-startup"],
    },
  },
});
