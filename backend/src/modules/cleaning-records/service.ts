import { Prisma } from "../../generated/prisma/client";
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

  const where = {
    equipmentId,
    ...(query.status ? { status: query.status } : {}),
  };
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.cleaningRecord.findMany({
      where,
      orderBy: { cleanedAt: "desc" },
      skip,
      take: query.pageSize,
    }),
    prisma.cleaningRecord.count({ where }),
  ]);

  return {
    ok: true as const,
    status: 200 as const,
    body: {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    },
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

  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.auditEntry.findMany({
      where: { cleaningRecordId: recordId },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
    }),
    prisma.auditEntry.count({ where: { cleaningRecordId: recordId } }),
  ]);

  return {
    ok: true as const,
    status: 200 as const,
    body: {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    },
  };
}
