import { promises as fs } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

let ran = false;

export async function runMigrations(db: Pool): Promise<void> {
  if (ran) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const dir = path.join(process.cwd(), "db", "migrations");
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  } catch {
    ran = true;
    return;
  }
  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    const existing = await db.query("SELECT 1 FROM schema_migrations WHERE id = $1", [id]);
    if (existing.rowCount) continue;
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    await db.query(sql);
    await db.query("INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING", [id]);
  }
  ran = true;
}
