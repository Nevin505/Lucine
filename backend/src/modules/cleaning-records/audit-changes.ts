import type { UpdateCleaningRecordInput } from "./schemas";

type ExistingRecord = {
  cleanedAt: Date;
  method: string;
  notes: string | null;
  status: "PENDING" | "VERIFIED";
};

export type AuditFieldChange = { from: unknown; to: unknown };

export function buildAuditChanges(
  existing: ExistingRecord,
  input: UpdateCleaningRecordInput,
): Record<string, AuditFieldChange> {
  const changes: Record<string, AuditFieldChange> = {};

  if (input.cleanedAt !== undefined) {
    changes.cleanedAt = { from: existing.cleanedAt, to: input.cleanedAt };
  }
  if (input.method !== undefined) {
    changes.method = { from: existing.method, to: input.method };
  }
  if (input.notes !== undefined) {
    changes.notes = { from: existing.notes, to: input.notes };
  }
  if (input.status !== undefined) {
    changes.status = { from: existing.status, to: input.status };
  }

  return changes;
}
