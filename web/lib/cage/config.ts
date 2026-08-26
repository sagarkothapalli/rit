/* ============================================================
   Runtime model config — admin-pasted API key persisted in
   Neon Postgres, resolved server-side ahead of env vars.
   Precedence: DB (admin, live=true) > env LLM_* > none.
   ============================================================ */
import type { ModelConfig } from "./client";
import { Pool } from "pg";

export const DEFAULT_BASE_URL = "https://api.gmi-cloud.com/v1";
export const DEFAULT_MODEL = "minimax/MiniMax-M3";

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

function db(): Pool | null {
  const url = process.env.DATABASE_URL;
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

async function readRow(): Promise<Row | null> {
  const p = db();
  if (!p) return null;
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
    // DB unreachable -> fall through to env-only resolution.
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
  if (!p) throw new Error("DATABASE_URL not configured");
  await readRow(); // ensure table exists
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
    [input.apiKey, input.baseUrl, input.modelFast, input.modelStrong || input.modelFast]
  );
  cache = null;
}

export async function setRuntimeLive(live: boolean): Promise<void> {
  const p = db();
  if (!p) throw new Error("DATABASE_URL not configured");
  await readRow();
  await p.query("UPDATE runtime_config SET live = $1, updated_at = now() WHERE id = 1", [live]);
  cache = null;
}

export async function clearRuntimeConfig(): Promise<void> {
  const p = db();
  if (!p) throw new Error("DATABASE_URL not configured");
  await readRow();
  await p.query("DELETE FROM runtime_config WHERE id = 1");
  cache = null;
}
