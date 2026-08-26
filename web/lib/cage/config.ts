/* ============================================================
   Runtime model config — admin-pasted API key persisted in
   Neon Postgres when DATABASE_URL is set, otherwise a local
   file. Resolved server-side ahead of env vars.
   Precedence: store (admin, live=true) > env LLM_* > none.
   ============================================================ */
import { promises as fs } from "fs";
import path from "path";
import type { ModelConfig } from "./client";
import { DEFAULT_MODEL } from "./models";
import { Pool } from "pg";

export { DEFAULT_BASE_URL, DEFAULT_MODEL, MODEL_CATALOG } from "./models";

interface Row {
  api_key: string;
  base_url: string;
  model_fast: string;
  model_strong: string;
  live: boolean;
  updated_at: Date;
}

let pool: Pool | null = null;
let cache: { cfg: ModelConfig | null; meta: ConfigMeta | null; at: number } | null = null;
const TTL_MS = 30_000;
const FILE_STORE = path.join(process.cwd(), ".data", "runtime-config.json");

function db(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

export interface ConfigMeta {
  live: boolean;
  baseUrl: string;
  modelFast: string;
  modelStrong: string;
  keyLast4: string;
  updatedAt: string | null;
}

async function readFileRow(): Promise<Row | null> {
  try {
    const raw = await fs.readFile(FILE_STORE, "utf8");
    const data = JSON.parse(raw) as {
      api_key?: unknown;
      base_url?: unknown;
      model_fast?: unknown;
      model_strong?: unknown;
      live?: unknown;
      updated_at?: unknown;
    };
    if (typeof data.api_key !== "string" || typeof data.base_url !== "string") return null;
    const fast = typeof data.model_fast === "string" ? data.model_fast : DEFAULT_MODEL;
    return {
      api_key: data.api_key,
      base_url: data.base_url,
      model_fast: fast,
      model_strong: typeof data.model_strong === "string" ? data.model_strong : fast,
      live: data.live !== false,
      updated_at: data.updated_at ? new Date(String(data.updated_at)) : new Date(),
    };
  } catch {
    return null;
  }
}

async function writeFileRow(row: Row | null): Promise<void> {
  await fs.mkdir(path.dirname(FILE_STORE), { recursive: true });
  if (!row) {
    await fs.rm(FILE_STORE, { force: true });
    return;
  }
  const payload = {
    api_key: row.api_key,
    base_url: row.base_url,
    model_fast: row.model_fast,
    model_strong: row.model_strong,
    live: row.live,
    updated_at: row.updated_at.toISOString(),
  };
  const tmp = `${FILE_STORE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
  await fs.rename(tmp, FILE_STORE);
}

async function readPgRow(p: Pool): Promise<Row | null> {
  await p.query(
    `CREATE TABLE IF NOT EXISTS runtime_config (
       id smallint PRIMARY KEY CHECK (id = 1),
       api_key text NOT NULL,
       base_url text NOT NULL,
       model_fast text NOT NULL,
       model_strong text NOT NULL,
       live boolean NOT NULL DEFAULT true,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`
  );
  const res = await p.query<Row>("SELECT * FROM runtime_config WHERE id = 1");
  return res.rows[0] ?? null;
}

async function readRow(): Promise<Row | null> {
  const p = db();
  if (p) {
    try {
      return await readPgRow(p);
    } catch {
      // DB unreachable -> fall through to file store.
    }
  }
  return readFileRow();
}

function envConfig(): ModelConfig | null {
  const baseUrl = process.env.LLM_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.LLM_API_KEY;
  const fast = process.env.LLM_MODEL_FAST;
  if (!baseUrl || !apiKey || !fast) return null;
  const strong = process.env.LLM_MODEL_STRONG || fast;
  return { baseUrl, apiKey, fast, strong };
}

function rowToCfg(row: Row): ModelConfig {
  return {
    baseUrl: row.base_url,
    apiKey: row.api_key,
    fast: row.model_fast,
    strong: row.model_strong,
  };
}

export async function getRuntimeModelConfig(): Promise<{
  cfg: ModelConfig | null;
  meta: ConfigMeta | null;
}> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return { cfg: cache.cfg, meta: cache.meta };

  let cfg: ModelConfig | null = null;
  let meta: ConfigMeta | null = null;
  try {
    const row = await readRow();
    if (row && row.live) cfg = rowToCfg(row);
    if (row) {
      meta = {
        live: row.live,
        baseUrl: row.base_url,
        modelFast: row.model_fast,
        modelStrong: row.model_strong,
        keyLast4: row.api_key.slice(-4),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
      };
    }
  } catch {
    // Store unreachable -> fall through to env-only resolution.
  }
  if (!cfg) cfg = envConfig();
  cache = { cfg, meta, at: now };
  return { cfg, meta };
}

export async function saveRuntimeConfig(input: {
  apiKey: string;
  baseUrl: string;
  modelFast: string;
  modelStrong?: string;
}): Promise<void> {
  const p = db();
  const modelStrong = input.modelStrong || input.modelFast;
  if (p) {
    await readPgRow(p);
    await p.query(
      `INSERT INTO runtime_config (id, api_key, base_url, model_fast, model_strong, live, updated_at)
       VALUES (1, $1, $2, $3, $4, true, now())
       ON CONFLICT (id) DO UPDATE SET
         api_key = EXCLUDED.api_key,
         base_url = EXCLUDED.base_url,
         model_fast = EXCLUDED.model_fast,
         model_strong = EXCLUDED.model_strong,
         live = true,
         updated_at = now()`,
      [input.apiKey, input.baseUrl, input.modelFast, modelStrong]
    );
  } else {
    await writeFileRow({
      api_key: input.apiKey,
      base_url: input.baseUrl,
      model_fast: input.modelFast,
      model_strong: modelStrong,
      live: true,
      updated_at: new Date(),
    });
  }
  cache = null;
}

export async function setRuntimeLive(live: boolean): Promise<void> {
  const p = db();
  if (p) {
    await readPgRow(p);
    await p.query("UPDATE runtime_config SET live = $1, updated_at = now() WHERE id = 1", [live]);
  } else {
    const row = await readFileRow();
    if (!row) throw new Error("No saved key to update");
    await writeFileRow({ ...row, live, updated_at: new Date() });
  }
  cache = null;
}

export async function clearRuntimeConfig(): Promise<void> {
  const p = db();
  if (p) {
    await readPgRow(p);
    await p.query("DELETE FROM runtime_config WHERE id = 1");
  } else {
    await writeFileRow(null);
  }
  cache = null;
}
