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
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@backend": path.resolve(__dirname, "./src/backend"),
    },
  },
  build: {
    outDir: ".vite/build",
    lib: {
      entry: "src/main.ts",
      formats: ["cjs"],
      fileName: () => "[name].js",
    },
    rollupOptions: {
      external: [
        "electron",
        "ws",
        "mqtt",
        "serialport",
        "@prisma/client",
        "bcrypt",
        "jsonwebtoken",
      ],
      output: {
        entryFileNames: "[name].js",
      },
    },
    // Prevent minification for better debugging
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
    // Ensure Node.js environment
    target: "node18",
  },
});
