import { z } from "zod";
import type { CaseRecord } from "@/lib/domain/case";
import { hashesEqual, hashAccessToken, isCaseId } from "./id";

export const PRAJA_REFERENCE_RE = /^PRTI\/(ACK|FA1|FA2|C18)\/\d{2}\/[A-Z2-9]{9}$/;

export const CaseWriteIdentity = z.object({
  id: z.string().uuid(),
  ownerEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  prajaReference: z.string().regex(PRAJA_REFERENCE_RE),
  accessToken: z.string().min(16).max(48).optional(),
  accessTokenHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  caseType: z.enum(["RTI_REQUEST", "FIRST_APPEAL", "SECOND_APPEAL", "SECTION_18_COMPLAINT"]),
});

export function stripClientSecrets(record: CaseRecord): CaseRecord {
  const copy = { ...record };
  delete copy.accessToken;
  return copy;
}

export function assertOwnedWrite(
  existing: CaseRecord | null,
  incoming: CaseRecord,
  actorEmail: string,
): { error: "FORBIDDEN" | "INVALID_CASE_ID" | "EMAIL_MISMATCH"; status: number } | null {
  if (!isCaseId(incoming.id)) return { error: "INVALID_CASE_ID", status: 400 };
  if (incoming.ownerEmail.trim().toLowerCase() !== actorEmail.trim().toLowerCase()) {
    return { error: "EMAIL_MISMATCH", status: 403 };
  }
  if (existing && existing.ownerEmail !== actorEmail.trim().toLowerCase()) {
    return { error: "FORBIDDEN", status: 403 };
  }
  if (existing && existing.id !== incoming.id) {
    return { error: "FORBIDDEN", status: 403 };
  }
  return null;
}

export async function isLegacyReferenceHash(record: CaseRecord): Promise<boolean> {
  const hashed = await hashAccessToken(record.prajaReference);
  return hashesEqual(record.accessTokenHash, hashed);
}

export async function accessTokenMatches(record: CaseRecord, token: string): Promise<boolean> {
  if (await isLegacyReferenceHash(record)) return false;
  const hashed = await hashAccessToken(token);
  return hashesEqual(record.accessTokenHash, hashed);
}
