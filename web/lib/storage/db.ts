import { Pool } from "pg";

let pool: Pool | null = null;

export function database(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 4 });
  }
  return pool;
}
