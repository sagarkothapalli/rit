import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Two modules once opened "praja-rti-applications" at versions 1 and 3. The
 * lower one threw a VersionError as soon as anything had upgraded the
 * database, which broke saving an acknowledgement for every returning
 * visitor. One opener is the only way to keep the versions honest.
 */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) found.push(full);
  }
  return found;
}

describe("local database", () => {
  it("is opened from exactly one module", () => {
    const root = path.join(__dirname, "..", "..");
    const callers = sourceFiles(root).filter((file) => readFileSync(file, "utf8").includes("indexedDB.open("));
    expect(callers.map((file) => path.relative(root, file))).toEqual(["lib/storage/cases.client.ts"]);
  });
});
