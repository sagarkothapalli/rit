import { defineConfig } from "vitest/config";
import path from "node:path";

/* Unit tests for the deterministic parts of the intake: the
   proceed detector, the jurisdiction classifier, and the field
   extraction that feeds a synthesised handoff. No DOM needed. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
});
