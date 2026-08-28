import type { AttachmentRecord } from "@/lib/domain/attachments";
import type { CaseEvent } from "@/lib/domain/events";
import type { CaseRecord, DeadlineRecord, OfficialReference } from "@/lib/domain/case";

function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

export function mergeEvents(existing: CaseEvent[], incoming: CaseEvent[]): CaseEvent[] {
  const seen = new Map<string, CaseEvent>();
  const keys = new Set<string>();
  for (const event of existing) {
    seen.set(event.id, event);
    if (event.idempotencyKey) keys.add(event.idempotencyKey);
  }
  for (const event of incoming) {
    if (seen.has(event.id)) continue;
    if (event.idempotencyKey && keys.has(event.idempotencyKey)) continue;
    seen.set(event.id, event);
    if (event.idempotencyKey) keys.add(event.idempotencyKey);
  }
  return [...seen.values()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));
}

export function mergeDeadlines(existing: DeadlineRecord[], incoming: DeadlineRecord[]): DeadlineRecord[] {
  const map = byId(existing);
  for (const row of incoming) {
    const prior = map.get(row.id);
    if (!prior) {
      map.set(row.id, row);
      continue;
    }
    if (prior.status === "SATISFIED") map.set(row.id, prior);
    else if (row.status === "SATISFIED") map.set(row.id, row);
    else map.set(row.id, row.createdAt >= prior.createdAt ? row : prior);
  }
  return [...map.values()];
}

export function mergeAttachments(existing: AttachmentRecord[], incoming: AttachmentRecord[]): AttachmentRecord[] {
  const map = byId(existing);
  for (const row of incoming) {
    const prior = map.get(row.id);
    if (!prior) {
      map.set(row.id, row);
      continue;
    }
    map.set(row.id, prior.deletedAt ? prior : row.deletedAt ? row : row);
  }
  return [...map.values()];
}

export function mergeReferences(existing: OfficialReference[], incoming: OfficialReference[]): OfficialReference[] {
  const map = byId(existing);
  for (const row of incoming) {
    if (!map.has(row.id)) map.set(row.id, row);
  }
  return [...map.values()];
}

export function mergeCaseRecords(existing: CaseRecord, incoming: CaseRecord): CaseRecord {
  const incomingNewer = incoming.updatedAt >= existing.updatedAt;
  const envelope = incomingNewer ? incoming : existing;
  return {
    ...envelope,
    id: existing.id,
    ownerEmail: existing.ownerEmail,
    accessTokenHash: existing.accessTokenHash,
    prajaReference: existing.prajaReference,
    createdAt: existing.createdAt,
    events: mergeEvents(existing.events, incoming.events),
    attachments: mergeAttachments(existing.attachments, incoming.attachments),
    officialReferences: mergeReferences(existing.officialReferences, incoming.officialReferences),
    deadlines: mergeDeadlines(existing.deadlines, incoming.deadlines),
    draftVersion: Math.max(existing.draftVersion, incoming.draftVersion),
    draft: incoming.draft.version >= existing.draft.version ? incoming.draft : existing.draft,
    updatedAt: incoming.updatedAt > existing.updatedAt ? incoming.updatedAt : existing.updatedAt,
  };
}
