import { promises as fs } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import { toSummary, type CaseRecord, type CaseSummary } from "@/lib/domain/case";
import { hydrateCase, hydratePayload } from "./factory";
import { database } from "./db";
import { runMigrations } from "./migrate";
import { assertCaseId, hashAccessToken, hashesEqual, isCaseId, makeAccessToken, newId } from "./id";
import { accessTokenMatches, assertOwnedWrite, stripClientSecrets } from "./case-guard";
import { mergeCaseRecords } from "./merge";
import { scheduleNotifications } from "@/lib/notifications/outbox";
import { publicFilingRules } from "@/lib/filing-rules/registry";
import { deleteAttachmentBytes } from "./attachments.server";

const FILE_DIR = path.join(process.cwd(), ".data", "cases");

export class CaseConflictError extends Error {
  constructor() {
    super("CASE_CONFLICT");
    this.name = "CaseConflictError";
  }
}

function resolveCaseFile(id: string): string {
  const safe = assertCaseId(id);
  const base = path.resolve(FILE_DIR);
  const target = path.resolve(base, `${safe}.json`);
  const prefix = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  if (target !== path.join(base, `${safe}.json`) || !target.startsWith(prefix)) {
    throw new Error("INVALID_CASE_PATH");
  }
  return target;
}

async function ensureDb() {
  const db = database();
  if (!db) return null;
  try {
    await runMigrations(db);
    await seedFilingRules(db);
    return db;
  } catch {
    return null;
  }
}

let seeded = false;
async function seedFilingRules(db: Pool): Promise<void> {
  if (seeded) return;
  for (const rule of publicFilingRules()) {
    await db.query(
      `INSERT INTO filing_rule_versions (id, destination, case_type, effective_from, verified_at, source_url, rules)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         verified_at = EXCLUDED.verified_at,
         source_url = EXCLUDED.source_url,
         rules = EXCLUDED.rules`,
      [rule.id, rule.destination, rule.caseType, rule.effectiveFrom, rule.verifiedAt, rule.sourceUrl, JSON.stringify(rule)],
    );
  }
  seeded = true;
}

async function saveFile(record: CaseRecord): Promise<void> {
  await fs.mkdir(FILE_DIR, { recursive: true });
  const target = resolveCaseFile(record.id);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(stripClientSecrets(record)), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, target);
}

async function readFile(id: string): Promise<CaseRecord | null> {
  if (!isCaseId(id)) return null;
  try {
    return hydrateCase(JSON.parse(await fs.readFile(resolveCaseFile(id), "utf8")) as CaseRecord);
  } catch {
    return null;
  }
}

async function deleteFile(id: string): Promise<void> {
  if (!isCaseId(id)) return;
  try {
    await fs.rm(resolveCaseFile(id), { force: true });
    await fs.rm(`${resolveCaseFile(id)}.tmp`, { force: true });
  } catch {
    // already gone
  }
}

async function listFiles(): Promise<CaseRecord[]> {
  try {
    const names = await fs.readdir(FILE_DIR);
    const rows = await Promise.all(
      names.filter((name) => name.endsWith(".json")).map(async (name) => {
        const id = name.replace(/\.json$/, "");
        if (!isCaseId(id)) return null;
        try {
          return hydrateCase(JSON.parse(await fs.readFile(path.join(FILE_DIR, `${id}.json`), "utf8")) as CaseRecord);
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

async function persistNormalized(db: Pool, record: CaseRecord): Promise<void> {
  const stored = stripClientSecrets(record);
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
      stored.id,
      stored.ownerEmail,
      stored.prajaReference,
      stored.accessTokenHash,
      stored.caseType,
      stored.parentCaseId,
      stored.targetOfficialReferenceId,
      stored.jurisdiction,
      stored.authorityCode,
      stored.authorityName,
      stored.authorityLevel,
      stored.filingChannel,
      stored.preparationStatus,
      stored.filingStatus,
      stored.outcomeStatus,
      stored.title,
      stored.language,
      stored.draftVersion,
      JSON.stringify(stored),
      stored.createdAt,
      stored.updatedAt,
      stored.archivedAt,
    ],
  );

  await db.query(
    `INSERT INTO case_applicants (case_id, payload) VALUES ($1, $2::jsonb)
     ON CONFLICT (case_id) DO UPDATE SET payload = EXCLUDED.payload`,
    [stored.id, JSON.stringify(stored.applicant)],
  );

  await db.query(
    `INSERT INTO case_drafts (id, case_id, version, payload, portal_text, character_count, created_at, confirmed_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
     ON CONFLICT (case_id, version) DO NOTHING`,
    [
      stored.draft.id,
      stored.id,
      stored.draft.version,
      JSON.stringify(stored.draft.payload),
      stored.draft.portalText,
      stored.draft.characterCount,
      stored.draft.createdAt,
      stored.draft.confirmedAt,
    ],
  );

  for (const reference of stored.officialReferences) {
    await db.query(
      `INSERT INTO official_references (
        id, case_id, registration_number, reference_kind, source, filed_at, received_at,
        parent_official_reference_id, is_primary, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        registration_number = EXCLUDED.registration_number,
        is_primary = EXCLUDED.is_primary`,
      [
        reference.id,
        stored.id,
        reference.registrationNumber,
        reference.referenceKind,
        reference.source,
        reference.filedAt,
        reference.receivedAt,
        reference.parentOfficialReferenceId,
        reference.isPrimary,
        reference.createdAt,
      ],
    );
  }

  for (const event of stored.events) {
    try {
      await db.query(
        `INSERT INTO case_events (
          id, case_id, official_reference_id, event_type, source, occurred_at, recorded_at, payload, created_by, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
        ON CONFLICT (id) DO NOTHING`,
        [
          event.id,
          stored.id,
          event.officialReferenceId,
          event.eventType,
          event.source,
          event.occurredAt,
          event.recordedAt,
          JSON.stringify(event.payload ?? {}),
          event.createdBy,
          event.idempotencyKey,
        ],
      );
    } catch {
      // Unique idempotency_key means the event is already durable.
    }
  }

  for (const attachment of stored.attachments) {
    await db.query(
      `INSERT INTO attachments (
        id, case_id, event_id, kind, original_name, stored_name, mime_type, byte_size, sha256,
        storage_key, page_count, language, verification_status, created_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET deleted_at = EXCLUDED.deleted_at, verification_status = EXCLUDED.verification_status`,
      [
        attachment.id,
        stored.id,
        attachment.eventId,
        attachment.kind,
        attachment.originalName,
        attachment.storedName,
        attachment.mimeType,
        attachment.byteSize,
        attachment.sha256,
        attachment.storageKey,
        attachment.pageCount,
        attachment.language,
        attachment.verificationStatus,
        attachment.createdAt,
        attachment.deletedAt,
      ],
    );
  }

  for (const deadline of stored.deadlines) {
    await db.query(
      `INSERT INTO deadlines (
        id, case_id, official_reference_id, kind, starts_at, due_at, rule_version, status,
        satisfied_by_event_id, created_at, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        satisfied_by_event_id = EXCLUDED.satisfied_by_event_id,
        payload = EXCLUDED.payload`,
      [
        deadline.id,
        stored.id,
        deadline.officialReferenceId,
        deadline.kind,
        deadline.startsAt,
        deadline.dueAt,
        deadline.ruleVersion,
        deadline.status,
        deadline.satisfiedByEventId,
        deadline.createdAt,
        JSON.stringify({ explanation: deadline.explanation, source: deadline.source }),
      ],
    );
  }

  for (const notice of scheduleNotifications(stored)) {
    await db.query(
      `INSERT INTO notifications (
        id, case_id, deadline_id, channel, template, scheduled_at, sent_at, status, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        newId(),
        stored.id,
        notice.deadlineId,
        notice.channel,
        notice.template,
        notice.scheduledAt,
        notice.sentAt,
        notice.status,
        notice.idempotencyKey,
      ],
    );
  }
}

async function assembleFromTables(db: Pool, id: string): Promise<CaseRecord | null> {
  const header = await db.query<{ payload: CaseRecord }>("SELECT payload FROM cases WHERE id = $1", [id]);
  if (!header.rows[0]) return null;
  const base = hydrateCase(header.rows[0].payload);
  try {
    const [events, attachments, deadlines, references, drafts] = await Promise.all([
      db.query("SELECT * FROM case_events WHERE case_id = $1 ORDER BY recorded_at", [id]),
      db.query("SELECT * FROM attachments WHERE case_id = $1 ORDER BY created_at", [id]),
      db.query("SELECT * FROM deadlines WHERE case_id = $1", [id]),
      db.query("SELECT * FROM official_references WHERE case_id = $1 ORDER BY created_at", [id]),
      db.query("SELECT * FROM case_drafts WHERE case_id = $1 ORDER BY version DESC LIMIT 1", [id]),
    ]);
    if (events.rows.length) {
      base.events = events.rows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        officialReferenceId: row.official_reference_id,
        eventType: row.event_type,
        source: row.source,
        occurredAt: new Date(row.occurred_at).toISOString(),
        recordedAt: new Date(row.recorded_at).toISOString(),
        payload: row.payload ?? {},
        createdBy: row.created_by,
        idempotencyKey: row.idempotency_key,
      }));
    }
    if (attachments.rows.length) {
      base.attachments = attachments.rows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        eventId: row.event_id,
        kind: row.kind,
        originalName: row.original_name,
        storedName: row.stored_name,
        mimeType: row.mime_type,
        byteSize: Number(row.byte_size),
        sha256: row.sha256,
        storageKey: row.storage_key,
        pageCount: row.page_count,
        language: row.language,
        verificationStatus: row.verification_status,
        createdAt: new Date(row.created_at).toISOString(),
        deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      }));
    }
    if (deadlines.rows.length) {
      base.deadlines = deadlines.rows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        officialReferenceId: row.official_reference_id,
        kind: row.kind,
        startsAt: new Date(row.starts_at).toISOString(),
        dueAt: new Date(row.due_at).toISOString(),
        ruleVersion: row.rule_version,
        status: row.status,
        satisfiedByEventId: row.satisfied_by_event_id,
        createdAt: new Date(row.created_at).toISOString(),
        explanation: row.payload?.explanation ?? "",
        source: row.payload?.source ?? "PRAJA",
      }));
    }
    if (references.rows.length) {
      base.officialReferences = references.rows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        registrationNumber: row.registration_number,
        referenceKind: row.reference_kind,
        source: row.source,
        filedAt: row.filed_at ? new Date(row.filed_at).toISOString() : null,
        receivedAt: row.received_at ? new Date(row.received_at).toISOString() : null,
        parentOfficialReferenceId: row.parent_official_reference_id,
        isPrimary: row.is_primary,
        createdAt: new Date(row.created_at).toISOString(),
      }));
    }
    if (drafts.rows[0]) {
      const draft = drafts.rows[0];
      base.draft = {
        id: draft.id,
        caseId: draft.case_id,
        version: draft.version,
        payload: hydratePayload(draft.payload),
        portalText: draft.portal_text,
        characterCount: draft.character_count,
        createdAt: new Date(draft.created_at).toISOString(),
        confirmedAt: draft.confirmed_at ? new Date(draft.confirmed_at).toISOString() : null,
      };
      base.draftVersion = draft.version;
    }
  } catch {
    // Payload snapshot remains usable.
  }
  return base;
}

export async function saveCaseRecord(
  record: CaseRecord,
  actorEmail?: string,
  expectedUpdatedAt?: string | null,
): Promise<"postgres" | "file"> {
  const existing = await getCaseRecord(record.id);
  if (actorEmail) {
    const blocked = assertOwnedWrite(existing, record, actorEmail);
    if (blocked) {
      const error = new Error(blocked.error);
      (error as Error & { status: number }).status = blocked.status;
      throw error;
    }
  }
  let next = stripClientSecrets({ ...record, id: assertCaseId(record.id) });
  if (record.accessToken) {
    next.accessTokenHash = await hashAccessToken(record.accessToken);
  } else if (existing) {
    next.accessTokenHash = existing.accessTokenHash;
  } else if (!next.accessTokenHash) {
    next.accessTokenHash = await hashAccessToken(makeAccessToken());
  }
  if (existing) {
    if (expectedUpdatedAt && expectedUpdatedAt !== existing.updatedAt) {
      throw new CaseConflictError();
    }
    next = mergeCaseRecords(existing, { ...next, ownerEmail: existing.ownerEmail, id: existing.id });
  }

  const db = await ensureDb();
  if (db) {
    try {
      await persistNormalized(db, next);
      return "postgres";
    } catch {
      // File store keeps the prototype usable.
    }
  }
  await saveFile(next);
  return "file";
}

export async function getCaseRecord(id: string): Promise<CaseRecord | null> {
  if (!isCaseId(id)) return null;
  const db = await ensureDb();
  if (db) {
    try {
      const assembled = await assembleFromTables(db, id);
      if (assembled) return assembled;
    } catch {
      // Fall through.
    }
  }
  return readFile(id);
}

export async function getCaseByReference(reference: string, accessToken?: string): Promise<CaseRecord | null> {
  const needle = reference.trim().toUpperCase();
  const db = await ensureDb();
  let record: CaseRecord | null = null;
  if (db) {
    try {
      const result = await db.query<{ payload: CaseRecord }>(
        "SELECT payload FROM cases WHERE praja_reference = $1 OR payload->>'legacyAcknowledgementNumber' = $1",
        [needle],
      );
      record = result.rows[0]?.payload ? hydrateCase(result.rows[0].payload) : null;
    } catch {
      record = null;
    }
  }
  if (!record) {
    const rows = await listFiles();
    record = rows.find((row) => row.prajaReference === needle || row.legacyAcknowledgementNumber === needle) ?? null;
  }
  if (!record) return null;
  if (accessToken && !(await accessTokenMatches(record, accessToken))) {
    // If a token was explicitly passed but does not match
    return null;
  }
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
      return result.rows.map((row) => toSummary(hydrateCase(row.payload)));
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
  if (!isCaseId(parentId)) return [];
  const db = await ensureDb();
  if (db) {
    try {
      const result = await db.query<{ payload: CaseRecord }>(
        "SELECT payload FROM cases WHERE parent_case_id = $1 ORDER BY created_at",
        [parentId],
      );
      return result.rows.map((row) => hydrateCase(row.payload));
    } catch {
      // Fall through.
    }
  }
  return (await listFiles()).filter((row) => row.parentCaseId === parentId);
}

export async function deleteCaseRecord(id: string, actorEmail: string, purge = false): Promise<boolean> {
  const record = await getCaseRecord(id);
  if (!record) return false;
  if (record.ownerEmail !== actorEmail.trim().toLowerCase()) return false;
  for (const attachment of record.attachments) {
    await deleteAttachmentBytes(attachment.storageKey);
  }
  const db = await ensureDb();
  if (purge) {
    if (db) {
      try {
        await db.query("DELETE FROM cases WHERE id = $1", [id]);
      } catch {
        // File delete still runs.
      }
    }
    await deleteFile(id);
    return true;
  }
  const archived = { ...record, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await saveCaseRecord(archived, actorEmail);
  return true;
}

export { hashesEqual, hashAccessToken };
