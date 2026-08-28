import { Prisma } from "../../generated/prisma/client";
import {
  encodeCursor,
  parseCursor,
  rowsAfter,
  toPage,
} from "../../lib/pagination";
import { prisma } from "../../lib/prisma";
import type {
  CreateEquipmentInput,
  ListEquipmentQuery,
  UpdateEquipmentInput,
} from "./schemas";

const codeExistsError = { error: "Equipment code already exists" as const };
const notFoundError = { error: "Equipment not found" as const };
const invalidCursor = { error: "Invalid cursor" as const };
const hasHistoryError = {
  error:
    "Equipment has cleaning history and cannot be deleted. Retire it instead." as const,
};

function isUniqueCodeConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  );
}

export async function listEquipment(query: ListEquipmentQuery) {
  const cursor = query.cursor ? parseCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    return { ok: false as const, status: 400 as const, body: invalidCursor };
  }

  const nameQuery = query.name?.trim();
  const rows = await prisma.equipment.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(nameQuery
        ? { name: { contains: nameQuery, mode: "insensitive" } }
        : {}),
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

export async function getEquipment(id: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      _count: { select: { cleaningRecords: true } },
    },
  });

  if (!equipment) {
    return { ok: false as const, status: 404 as const, body: notFoundError };
  }

  const { _count, ...rest } = equipment;
  return {
    ok: true as const,
    status: 200 as const,
    body: {
      ...rest,
      cleaningRecordCount: _count.cleaningRecords,
    },
  };
}

export async function createEquipment(input: CreateEquipmentInput) {
  try {
    const equipment = await prisma.equipment.create({
      data: {
        name: input.name,
        code: input.code,
        ...(input.status ? { status: input.status } : {}),
      },
    });

    return { ok: true as const, status: 201 as const, body: equipment };
  } catch (err) {
    if (isUniqueCodeConflict(err)) {
      return { ok: false as const, status: 409 as const, body: codeExistsError };
    }
    throw err;
  }
}

export async function updateEquipment(id: string, input: UpdateEquipmentInput) {
  try {
    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return { ok: true as const, status: 200 as const, body: equipment };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false as const, status: 404 as const, body: notFoundError };
    }
    if (isUniqueCodeConflict(err)) {
      return { ok: false as const, status: 409 as const, body: codeExistsError };
    }
    throw err;
  }
}

export async function deleteEquipment(id: string) {
  const existing = await prisma.equipment.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false as const, status: 404 as const, body: notFoundError };
  }

  const cleaningRecordCount = await prisma.cleaningRecord.count({
    where: { equipmentId: id },
  });

  if (cleaningRecordCount > 0) {
    return { ok: false as const, status: 409 as const, body: hasHistoryError };
  }

  await prisma.equipment.delete({ where: { id } });

  return { ok: true as const, status: 204 as const };
}
