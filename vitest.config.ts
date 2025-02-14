/// <reference types="vitest" />
import { defineConfig, mergeConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const baseConfig = defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "./src/shared"),
      "@backend": resolve(__dirname, "./src/backend"),
      "@renderer": resolve(__dirname, "./src/renderer"),
    },
  },
});

// Configuration for React components
export const reactConfig = mergeConfig(baseConfig, {
  plugins: [react()],
  test: {
    name: "react",
    globals: true,
    environment: "jsdom",
    include: ["src/renderer/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});

// Configuration for Node.js backend
export const nodeConfig = mergeConfig(baseConfig, {
  test: {
    globals: true,
    environment: "node",
    include: ["src/backend/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "./src/shared"),
      "@backend": resolve(__dirname, "./src/backend"),
    },
  },
});

// Default config for running all tests
export default mergeConfig(baseConfig, {
  test: {
    globals: true,
    environment: "node",
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
