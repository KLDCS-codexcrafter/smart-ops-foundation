import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// P8.1 · Pass 2a · In-test ESLint family (sprint-81a/81c/83/84/85) runs the
// ESLint API in-process; individual tests legitimately take ~95s. On the default
// `threads` pool this exceeds the 60s `onTaskUpdate` RPC heartbeat and surfaces
// as spurious "Unhandled Errors" even though every assertion passes. Routing
// the family to the `forks` pool with `singleFork: true` runs them in the main
// child process where the heartbeat is not engaged — no timeout-raising hack.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    poolMatchGlobs: [
      ["src/test/sprint-81a/**", "forks"],
      ["src/test/sprint-81c/**", "forks"],
      ["src/test/sprint-83/**", "forks"],
      ["src/test/sprint-84/**", "forks"],
      ["src/test/sprint-85/**", "forks"],
    ],
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
