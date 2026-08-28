import { promises as fs } from "node:fs";
import path from "node:path";
import { toSummary, type CaseRecord, type CaseSummary } from "@/lib/domain/case";
import { database } from "./db";
import { runMigrations } from "./migrate";

const FILE_DIR = path.join(process.cwd(), ".data", "cases");

async function ensureDb() {
  const db = database();
  if (!db) return null;
  try {
    await runMigrations(db);
    return db;
  } catch {
    return null;
  }
}

async function saveFile(record: CaseRecord): Promise<void> {
  await fs.mkdir(FILE_DIR, { recursive: true });
  const target = path.join(FILE_DIR, `${record.id}.json`);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(record), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, target);
}

async function readFile(id: string): Promise<CaseRecord | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(FILE_DIR, `${id}.json`), "utf8")) as CaseRecord;
  } catch {
    return null;
  }
}

async function listFiles(): Promise<CaseRecord[]> {
  try {
    const names = await fs.readdir(FILE_DIR);
    const rows = await Promise.all(
      names.filter((name) => name.endsWith(".json")).map(async (name) => {
        try {
          return JSON.parse(await fs.readFile(path.join(FILE_DIR, name), "utf8")) as CaseRecord;
        } catch {
          return null;
        }
      }),
    );
    return rows.filter((row): row is CaseRecord => row !== null);
  } catch {
    return [];
  }
}

export async function saveCaseRecord(record: CaseRecord): Promise<"postgres" | "file"> {
  const db = await ensureDb();
  if (db) {
    try {
      await db.query(
        `INSERT INTO cases (
          id, owner_id, owner_email, praja_reference, access_token_hash, case_type, parent_case_id,
          target_official_reference_id, jurisdiction, authority_code, authority_name, authority_level,
          filing_channel, preparation_status, filing_status, outcome_status, title, language,
          draft_version, payload, created_at, updated_at, archived_at
        ) VALUES (
          $1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22
        )
        ON CONFLICT (id) DO UPDATE SET
          owner_email = EXCLUDED.owner_email,
          praja_reference = EXCLUDED.praja_reference,
          access_token_hash = EXCLUDED.access_token_hash,
          case_type = EXCLUDED.case_type,
          parent_case_id = EXCLUDED.parent_case_id,
          target_official_reference_id = EXCLUDED.target_official_reference_id,
          jurisdiction = EXCLUDED.jurisdiction,
          authority_code = EXCLUDED.authority_code,
          authority_name = EXCLUDED.authority_name,
          authority_level = EXCLUDED.authority_level,
          filing_channel = EXCLUDED.filing_channel,
          preparation_status = EXCLUDED.preparation_status,
          filing_status = EXCLUDED.filing_status,
          outcome_status = EXCLUDED.outcome_status,
          title = EXCLUDED.title,
          language = EXCLUDED.language,
          draft_version = EXCLUDED.draft_version,
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at,
          archived_at = EXCLUDED.archived_at`,
        [
          record.id,
          record.ownerEmail,
          record.prajaReference,
          record.accessTokenHash,
          record.caseType,
          record.parentCaseId,
          record.targetOfficialReferenceId,
          record.jurisdiction,
          record.authorityCode,
          record.authorityName,
          record.authorityLevel,
          record.filingChannel,
          record.preparationStatus,
          record.filingStatus,
          record.outcomeStatus,
          record.title,
          record.language,
          record.draftVersion,
          JSON.stringify(record),
          record.createdAt,
          record.updatedAt,
          record.archivedAt,
        ],
      );
      return "postgres";
    } catch {
      // File store keeps the prototype usable.
    }
  }
  await saveFile(record);
  return "file";
}

export async function getCaseRecord(id: string): Promise<CaseRecord | null> {
  const db = await ensureDb();
  if (db) {
    try {
      const result = await db.query<{ payload: CaseRecord }>("SELECT payload FROM cases WHERE id = $1", [id]);
      if (result.rows[0]) return result.rows[0].payload;
    } catch {
      // Fall through.
    }
  }
  return readFile(id);
}

export async function getCaseByReference(reference: string, accessTokenHash?: string): Promise<CaseRecord | null> {
  const needle = reference.trim().toUpperCase();
  const db = await ensureDb();
  if (db) {
    try {
      const result = await db.query<{ payload: CaseRecord }>(
        "SELECT payload FROM cases WHERE praja_reference = $1 OR payload->>'legacyAcknowledgementNumber' = $1",
        [needle],
      );
      const record = result.rows[0]?.payload ?? null;
      if (record && accessTokenHash && record.accessTokenHash !== accessTokenHash) return null;
      return record;
    } catch {
      // Fall through.
    }
  }
  const rows = await listFiles();
  const record = rows.find((row) => row.prajaReference === needle || row.legacyAcknowledgementNumber === needle) ?? null;
  if (record && accessTokenHash && record.accessTokenHash !== accessTokenHash) return null;
  return record;
}

export async function listCaseRecords(ownerEmail: string): Promise<CaseSummary[]> {
  const email = ownerEmail.trim().toLowerCase();
  const db = await ensureDb();
  if (db) {
    try {
      const result = await db.query<{ payload: CaseRecord }>(
        "SELECT payload FROM cases WHERE owner_email = $1 AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100",
        [email],
      );
      return result.rows.map((row) => toSummary(row.payload));
    } catch {
      // Fall through.
    }
  }
  return (await listFiles())
    .filter((row) => row.ownerEmail === email && !row.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary);
}

export async function listChildCases(parentId: string): Promise<CaseRecord[]> {
  const db = await ensureDb();
  if (db) {
    try {
      const result = await db.query<{ payload: CaseRecord }>(
        "SELECT payload FROM cases WHERE parent_case_id = $1 ORDER BY created_at",
        [parentId],
      );
      return result.rows.map((row) => row.payload);
    } catch {
      // Fall through.
    }
  }
  return (await listFiles()).filter((row) => row.parentCaseId === parentId);
}
