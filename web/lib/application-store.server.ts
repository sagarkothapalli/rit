import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import type { ApplicationSummary, StoredApplication } from "@/lib/application-records";

let pool: Pool | null = null;
const FILE_DIR = path.join(process.cwd(), ".data", "applications");

function database(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
}

async function ensureTable(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS praja_rti_applications (
      acknowledgement_number text PRIMARY KEY,
      reference text NOT NULL,
      applicant_email text NOT NULL,
      created_at timestamptz NOT NULL,
      payload jsonb NOT NULL,
      application_pdf bytea NOT NULL,
      receipt_pdf bytea NOT NULL
    )
  `);
  await db.query(
    "CREATE INDEX IF NOT EXISTS praja_rti_applications_email_idx ON praja_rti_applications (applicant_email, created_at DESC)",
  );
}

function filePath(acknowledgementNumber: string): string {
  const name = createHash("sha256").update(acknowledgementNumber).digest("hex");
  return path.join(FILE_DIR, `${name}.json`);
}

function withoutPdfs(record: StoredApplication): Omit<StoredApplication, "applicationPdfBase64" | "receiptPdfBase64"> {
  return {
    acknowledgementNumber: record.acknowledgementNumber,
    reference: record.reference,
    createdAt: record.createdAt,
    status: record.status,
    governmentSubmissionStatus: record.governmentSubmissionStatus,
    applicant: record.applicant,
    report: record.report,
  };
}

function summary(record: StoredApplication): ApplicationSummary {
  return {
    acknowledgementNumber: record.acknowledgementNumber,
    reference: record.reference,
    createdAt: record.createdAt,
    title: record.report.title,
    authority: record.report.authority.name,
    status: record.status,
  };
}

async function saveFile(record: StoredApplication): Promise<void> {
  await fs.mkdir(FILE_DIR, { recursive: true });
  const target = filePath(record.acknowledgementNumber);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(record), { encoding: "utf8", mode: 0o600, flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
    await fs.rm(tmp, { force: true });
    await fs.writeFile(tmp, JSON.stringify(record), { encoding: "utf8", mode: 0o600 });
  });
  await fs.rename(tmp, target);
}

async function getFile(acknowledgementNumber: string): Promise<StoredApplication | null> {
  try {
    return JSON.parse(await fs.readFile(filePath(acknowledgementNumber), "utf8")) as StoredApplication;
  } catch {
    return null;
  }
}

async function listFiles(email: string): Promise<ApplicationSummary[]> {
  try {
    const names = await fs.readdir(FILE_DIR);
    const rows = await Promise.all(
      names.filter((name) => name.endsWith(".json")).map(async (name) => {
        try {
          return JSON.parse(await fs.readFile(path.join(FILE_DIR, name), "utf8")) as StoredApplication;
        } catch {
          return null;
        }
      }),
    );
    return rows
      .filter((row): row is StoredApplication => row !== null && row.applicant.email === email)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map(summary);
  } catch {
    return [];
  }
}

export async function saveStoredApplication(record: StoredApplication): Promise<"postgres" | "file"> {
  const db = database();
  if (db) {
    try {
      await ensureTable(db);
      await db.query(
        `INSERT INTO praja_rti_applications
          (acknowledgement_number, reference, applicant_email, created_at, payload, application_pdf, receipt_pdf)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         ON CONFLICT (acknowledgement_number) DO UPDATE SET
           reference = EXCLUDED.reference,
           applicant_email = EXCLUDED.applicant_email,
           created_at = EXCLUDED.created_at,
           payload = EXCLUDED.payload,
           application_pdf = EXCLUDED.application_pdf,
           receipt_pdf = EXCLUDED.receipt_pdf`,
        [
          record.acknowledgementNumber,
          record.reference,
          record.applicant.email,
          record.createdAt,
          JSON.stringify(withoutPdfs(record)),
          Buffer.from(record.applicationPdfBase64, "base64"),
          Buffer.from(record.receiptPdfBase64, "base64"),
        ],
      );
      return "postgres";
    } catch {
      // A local file keeps the prototype usable when the configured DB is unreachable.
    }
  }
  await saveFile(record);
  return "file";
}

export async function getStoredApplication(acknowledgementNumber: string): Promise<StoredApplication | null> {
  const db = database();
  if (db) {
    try {
      await ensureTable(db);
      const result = await db.query<{
        payload: Omit<StoredApplication, "applicationPdfBase64" | "receiptPdfBase64">;
        application_pdf: Buffer;
        receipt_pdf: Buffer;
      }>(
        "SELECT payload, application_pdf, receipt_pdf FROM praja_rti_applications WHERE acknowledgement_number = $1",
        [acknowledgementNumber],
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        ...row.payload,
        applicationPdfBase64: row.application_pdf.toString("base64"),
        receiptPdfBase64: row.receipt_pdf.toString("base64"),
      };
    } catch {
      // Fall through to the development file store.
    }
  }
  return getFile(acknowledgementNumber);
}

export async function listStoredApplications(email: string): Promise<ApplicationSummary[]> {
  const db = database();
  if (db) {
    try {
      await ensureTable(db);
      const result = await db.query<{ payload: Omit<StoredApplication, "applicationPdfBase64" | "receiptPdfBase64"> }>(
        "SELECT payload FROM praja_rti_applications WHERE applicant_email = $1 ORDER BY created_at DESC LIMIT 50",
        [email],
      );
      return result.rows.map((row) => summary({ ...row.payload, applicationPdfBase64: "", receiptPdfBase64: "" }));
    } catch {
      // Fall through to the development file store.
    }
  }
  return listFiles(email);
}
