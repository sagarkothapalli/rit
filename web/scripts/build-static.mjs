#!/usr/bin/env node
/* ============================================================
   Build the static export for hosted deploys (here.now etc.).

   Route handlers under app/api carry `dynamic = "force-dynamic"`,
   which `output: "export"` rejects. A hosted static site cannot use
   them anyway (gates go through the hosting proxy at /api/llm),
   so the directory is moved aside just for this build and ALWAYS
   restored afterwards — failure-safe, so local/server runs are
   never affected.

   Produces: out/ (+ out/.herenow/proxy.json from hosting/proxy.json)
   ============================================================ */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const apiDir = path.join(root, "app", "api");
const stashDir = path.join(root, ".api-stash-for-static-build");
const proxySrc = path.join(root, "hosting", "proxy.json");
const manifestDir = path.join(root, "out", ".herenow");

let stashed = false;
if (existsSync(apiDir)) {
  renameSync(apiDir, stashDir);
  stashed = true;
}
// Stale `next dev` generated validators pin app/api route module paths,
// which do not exist while the directory is stashed. Type checking of
// real sources still runs; the dev artifacts are regenerated later.
rmSync(path.join(root, ".next", "dev", "types"), { recursive: true, force: true });

try {
  const res = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
    shell: process.platform === "win32",
  });
  if (res.error || res.status !== 0) {
    throw new Error(`next build failed${res.status ? ` (exit ${res.status})` : ""}`);
  }
} finally {
  if (stashed && existsSync(stashDir)) {
    renameSync(stashDir, apiDir);
  }
}

if (!existsSync(path.join(root, "out", "index.html"))) {
  throw new Error("Static export incomplete: out/index.html missing.");
}
mkdirSync(manifestDir, { recursive: true });
cpSync(proxySrc, path.join(manifestDir, "proxy.json"));
console.log("\nStatic export ready: ./out (hosting proxy manifest copied to out/.herenow/proxy.json)");
