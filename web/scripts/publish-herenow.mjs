#!/usr/bin/env node
/* ============================================================
   Publish ./out to here.now with incremental, hash-based uploads.

   Usage: node scripts/publish-herenow.mjs [slug]
          slug defaults to the entry in .herenow/state.json

   Credentials: $HERENOW_API_KEY or ~/.herenow/credentials
   Flow (docs: here.now/api#update): PUT /api/v1/publish/:slug with
   {path,size,contentType,hash} per file -> PUT changed files to
   presigned URLs -> POST /finalize.
   ============================================================ */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const OUT_DIR = path.resolve(process.cwd(), "out");
const STATE_FILE = path.resolve(process.cwd(), ".herenow", "state.json");
const API = "https://here.now/api/v1";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};

function apiKey() {
  if (process.env.HERENOW_API_KEY) return process.env.HERENOW_API_KEY.trim();
  try {
    return readFileSync(path.join(process.env.HOME ?? "", ".herenow", "credentials"), "utf8").trim();
  } catch {
    throw new Error("No API key: set HERENOW_API_KEY or create ~/.herenow/credentials");
  }
}

function defaultSlug() {
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  return Object.keys(state.publishes)[0];
}

function walk(dir, base = dir, acc = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, base, acc);
    } else if (st.isFile()) {
      acc.push({ full, rel: path.relative(base, full).split(path.sep).join("/") });
    }
  }
  return acc;
}

async function pool(items, limit, worker) {
  const errors = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        try {
          await worker(item);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    })
  );
  if (errors.length > 0) throw new Error(`Upload failures:\n${errors.join("\n")}`);
}

async function main() {
  const slug = process.argv[2] || defaultSlug();
  if (!slug) throw new Error("No slug given and none in .herenow/state.json");
  const token = apiKey();

  const files = walk(OUT_DIR).map(({ full, rel }) => {
    const data = readFileSync(full);
    const ext = path.extname(rel).toLowerCase();
    return {
      rel,
      data,
      size: data.byteLength,
      contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
      hash: createHash("sha256").update(data).digest("hex"),
    };
  });
  console.log(`Publishing ${files.length} files from ./out to site "${slug}"...`);

  const manifest = files.map(({ rel, size, contentType, hash }) => ({ path: rel, size, contentType, hash }));
  const put = await fetch(`${API}/publish/${slug}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-HereNow-Client": "cline/direct-api",
    },
    body: JSON.stringify({ files: manifest }),
  });
  if (!put.ok) throw new Error(`Version create failed: HTTP ${put.status} ${await put.text()}`);
  const created = await put.json();
  const upload = created.upload;
  console.log(
    `New version ${upload.versionId}: ${upload.skipped.length} unchanged, ${upload.uploads.length} to upload.`
  );

  await pool(upload.uploads, 6, async (entry) => {
    const file = files.find((f) => f.rel === entry.path);
    if (!file) throw new Error(`No local file for presigned upload ${entry.path}`);
    const res = await fetch(entry.url, {
      method: entry.method ?? "PUT",
      headers: { "Content-Type": entry.headers?.["Content-Type"] ?? file.contentType },
      body: file.data,
    });
    if (!res.ok) throw new Error(`${entry.path}: HTTP ${res.status}`);
    console.log(`  uploaded ${entry.path}`);
  });

  const fin = await fetch(upload.finalizeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-HereNow-Client": "cline/direct-api",
    },
    body: JSON.stringify({ versionId: upload.versionId }),
  });
  if (!fin.ok) throw new Error(`Finalize failed: HTTP ${fin.status} ${await fin.text()}`);
  const done = await fin.json();
  console.log(`\nLive at ${done.siteUrl} (version ${done.currentVersionId}, state: ${done.publishStatus?.state})`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
