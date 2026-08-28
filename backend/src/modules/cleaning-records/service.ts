import { Prisma } from "../../generated/prisma/client";
import {
  encodeCursor,
  parseCursor,
  rowsAfter,
  toPage,
} from "../../lib/pagination";
import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../../types/express";
import { buildAuditChanges } from "./audit-changes";
import type {
  CreateCleaningRecordInput,
  ListAuditEntriesQuery,
  ListCleaningRecordsQuery,
  UpdateCleaningRecordInput,
} from "./schemas";

const equipmentNotFound = { error: "Equipment not found" as const };
const recordNotFound = { error: "Cleaning record not found" as const };
const invalidCursor = { error: "Invalid cursor" as const };
const retiredModifyError = {
  error: "Cannot modify cleaning records for retired equipment" as const,
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function assertEquipmentExists(equipmentId: string) {
  return prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, status: true },
  });
}

export async function listCleaningRecords(
  equipmentId: string,
  query: ListCleaningRecordsQuery,
) {
  const equipment = await assertEquipmentExists(equipmentId);
  if (!equipment) {
    return { ok: false as const, status: 404 as const, body: equipmentNotFound };
  }

  const cursor = query.cursor ? parseCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    return { ok: false as const, status: 400 as const, body: invalidCursor };
  }

  const rows = await prisma.cleaningRecord.findMany({
    where: {
      equipmentId,
      ...(query.status ? { status: query.status } : {}),
      ...(cursor ? rowsAfter("cleanedAt", cursor) : {}),
    },
    orderBy: [{ cleanedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
  });

  const { items, pageInfo } = toPage(rows, query.limit, (row) =>
    encodeCursor(row.cleanedAt, row.id),
  );

  return {
    ok: true as const,
    status: 200 as const,
    body: { items, pageInfo },
  };
}

export async function createCleaningRecord(
  equipmentId: string,
  input: CreateCleaningRecordInput,
  user: AuthUser,
) {
  const equipment = await assertEquipmentExists(equipmentId);
  if (!equipment) {
    return { ok: false as const, status: 404 as const, body: equipmentNotFound };
  }
  if (equipment.status === "RETIRED") {
    return { ok: false as const, status: 409 as const, body: retiredModifyError };
  }

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.cleaningRecord.create({
      data: {
        equipmentId,
        cleanedById: user.id,
        cleanedByName: user.name,
        cleanedAt: input.cleanedAt,
        method: input.method,
        notes: input.notes,
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await tx.auditEntry.create({
      data: {
        cleaningRecordId: created.id,
        userId: user.id,
        userName: user.name,
        action: "CREATE",
        changes: toJsonValue(created),
      },
    });

    return created;
  });

  return { ok: true as const, status: 201 as const, body: record };
}

export async function updateCleaningRecord(
  equipmentId: string,
  id: string,
  input: UpdateCleaningRecordInput,
  user: AuthUser,
) {
  const equipment = await assertEquipmentExists(equipmentId);
  if (!equipment) {
    return { ok: false as const, status: 404 as const, body: equipmentNotFound };
  }
  if (equipment.status === "RETIRED") {
    return { ok: false as const, status: 409 as const, body: retiredModifyError };
  }

  const existing = await prisma.cleaningRecord.findFirst({
    where: { id, equipmentId },
  });

  if (!existing) {
    return { ok: false as const, status: 404 as const, body: recordNotFound };
  }

  const changes = buildAuditChanges(existing, input);

  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.cleaningRecord.update({
      where: { id },
      data: {
        ...(input.cleanedAt !== undefined ? { cleanedAt: input.cleanedAt } : {}),
        ...(input.method !== undefined ? { method: input.method } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    await tx.auditEntry.create({
      data: {
        cleaningRecordId: updated.id,
        userId: user.id,
        userName: user.name,
        action: "UPDATE",
        changes: toJsonValue(changes),
      },
    });

    return updated;
  });

  return { ok: true as const, status: 200 as const, body: record };
}

export async function listAuditEntries(
  equipmentId: string,
  recordId: string,
  query: ListAuditEntriesQuery,
) {
  const record = await prisma.cleaningRecord.findFirst({
    where: { id: recordId, equipmentId },
    select: { id: true },
  });

  if (!record) {
    return { ok: false as const, status: 404 as const, body: recordNotFound };
  }

  const cursor = query.cursor ? parseCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    return { ok: false as const, status: 400 as const, body: invalidCursor };
  }

  const rows = await prisma.auditEntry.findMany({
    where: {
      cleaningRecordId: recordId,
      ...(cursor ? rowsAfter("createdAt", cursor) : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
  });

  const { items, pageInfo } = toPage(rows, query.limit, (row) =>
    encodeCursor(row.createdAt, row.id),
  );

  return {
    ok: true as const,
    status: 200 as const,
    body: { items, pageInfo },
  };
}
