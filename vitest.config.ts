import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: process.platform === "win32" ? "vmThreads" : "forks",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
