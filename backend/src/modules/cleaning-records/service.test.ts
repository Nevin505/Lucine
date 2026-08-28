import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCursor } from "../../lib/pagination";

const {
  equipmentFindUnique,
  cleaningRecordFindMany,
  cleaningRecordFindFirst,
  txCreate,
  txUpdate,
  auditCreate,
  auditFindMany,
  transaction,
} = vi.hoisted(() => ({
  equipmentFindUnique: vi.fn(),
  cleaningRecordFindMany: vi.fn(),
  cleaningRecordFindFirst: vi.fn(),
  txCreate: vi.fn(),
  txUpdate: vi.fn(),
  auditCreate: vi.fn(),
  auditFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    equipment: { findUnique: equipmentFindUnique },
    cleaningRecord: {
      findMany: cleaningRecordFindMany,
      findFirst: cleaningRecordFindFirst,
    },
    auditEntry: {
      findMany: auditFindMany,
    },
    $transaction: transaction,
  },
}));

import {
  createCleaningRecord,
  listAuditEntries,
  listCleaningRecords,
  updateCleaningRecord,
} from "./service";

const user = { id: "user-1", name: "Alex Operator", role: "OPERATOR" as const };

const cleanedAt = new Date("2026-01-15T10:00:00.000Z");

describe("listCleaningRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipmentFindUnique.mockResolvedValue({ id: "eq-1", status: "ACTIVE" });
    cleaningRecordFindMany.mockResolvedValue([
      { id: "rec-2", cleanedAt },
      { id: "rec-3", cleanedAt },
    ]);
  });

  it("fetches the first page with limit + 1", async () => {
    const result = await listCleaningRecords("eq-1", { limit: 10 });

    expect(cleaningRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { equipmentId: "eq-1" },
        orderBy: [{ cleanedAt: "desc" }, { id: "desc" }],
        take: 11,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        items: [
          { id: "rec-2", cleanedAt },
          { id: "rec-3", cleanedAt },
        ],
        pageInfo: {
          hasNextPage: false,
          endCursor: encodeCursor(cleanedAt, "rec-3"),
        },
      },
    });
  });

  it("applies a cursor filter when provided", async () => {
    const cursor = encodeCursor(cleanedAt, "rec-2");

    await listCleaningRecords("eq-1", { limit: 10, cursor });

    expect(cleaningRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          equipmentId: "eq-1",
          OR: expect.any(Array),
        }),
        take: 11,
      }),
    );
  });

  it("returns hasNextPage when an extra row is fetched", async () => {
    cleaningRecordFindMany.mockResolvedValue(
      Array.from({ length: 4 }, (_, i) => ({
        id: `rec-${i}`,
        cleanedAt,
      })),
    );

    const result = await listCleaningRecords("eq-1", { limit: 3 });

    expect(result.body.items).toHaveLength(3);
    expect(result.body.pageInfo.hasNextPage).toBe(true);
  });

  it("filters by status when provided", async () => {
    await listCleaningRecords("eq-1", {
      limit: 20,
      status: "VERIFIED",
    });

    expect(cleaningRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { equipmentId: "eq-1", status: "VERIFIED" },
        take: 21,
      }),
    );
  });

  it("returns 400 for an invalid cursor", async () => {
    const result = await listCleaningRecords("eq-1", {
      limit: 10,
      cursor: "not-a-cursor",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      body: { error: "Invalid cursor" },
    });
    expect(cleaningRecordFindMany).not.toHaveBeenCalled();
  });

  it("returns 404 when equipment does not exist", async () => {
    equipmentFindUnique.mockResolvedValue(null);

    const result = await listCleaningRecords("missing", { limit: 20 });

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Equipment not found" },
    });
    expect(cleaningRecordFindMany).not.toHaveBeenCalled();
  });
});

describe("createCleaningRecord", () => {
  const input = {
    cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
    method: "Steam",
    notes: "Routine pass",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    equipmentFindUnique.mockResolvedValue({ id: "eq-1", status: "ACTIVE" });
    txCreate.mockResolvedValue({ id: "rec-new", ...input, equipmentId: "eq-1" });
    auditCreate.mockResolvedValue({ id: "audit-1" });
    transaction.mockImplementation(async (fn) =>
      fn({
        cleaningRecord: { create: txCreate },
        auditEntry: { create: auditCreate },
      }),
    );
  });

  it("creates a record and audit entry", async () => {
    const result = await createCleaningRecord("eq-1", input, user);

    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          equipmentId: "eq-1",
          cleanedById: user.id,
          cleanedByName: user.name,
          method: "Steam",
        }),
      }),
    );
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CREATE",
          userId: user.id,
        }),
      }),
    );
    expect(result).toMatchObject({ ok: true, status: 201 });
  });

  it("returns 404 when equipment does not exist", async () => {
    equipmentFindUnique.mockResolvedValue(null);

    const result = await createCleaningRecord("missing", input, user);

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Equipment not found" },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns 409 when equipment is retired", async () => {
    equipmentFindUnique.mockResolvedValue({ id: "eq-1", status: "RETIRED" });

    const result = await createCleaningRecord("eq-1", input, user);

    expect(result).toEqual({
      ok: false,
      status: 409,
      body: { error: "Cannot modify cleaning records for retired equipment" },
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("updateCleaningRecord", () => {
  const existing = {
    id: "rec-1",
    equipmentId: "eq-1",
    cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
    method: "Steam",
    notes: "Initial pass",
    status: "PENDING" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    equipmentFindUnique.mockResolvedValue({ id: "eq-1", status: "ACTIVE" });
    cleaningRecordFindFirst.mockResolvedValue(existing);
    txUpdate.mockResolvedValue({ ...existing, method: "CIP" });
    auditCreate.mockResolvedValue({ id: "audit-2" });
    transaction.mockImplementation(async (fn) =>
      fn({
        cleaningRecord: { update: txUpdate },
        auditEntry: { create: auditCreate },
      }),
    );
  });

  it("updates a record and writes an audit diff", async () => {
    const result = await updateCleaningRecord(
      "eq-1",
      "rec-1",
      { method: "CIP" },
      user,
    );

    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rec-1" },
        data: { method: "CIP" },
      }),
    );
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "UPDATE",
          changes: { method: { from: "Steam", to: "CIP" } },
        }),
      }),
    );
    expect(result).toMatchObject({ ok: true, status: 200 });
  });

  it("returns 404 when the record does not exist", async () => {
    cleaningRecordFindFirst.mockResolvedValue(null);

    const result = await updateCleaningRecord(
      "eq-1",
      "missing",
      { method: "CIP" },
      user,
    );

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Cleaning record not found" },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns 409 when equipment is retired", async () => {
    equipmentFindUnique.mockResolvedValue({ id: "eq-1", status: "RETIRED" });

    const result = await updateCleaningRecord(
      "eq-1",
      "rec-1",
      { method: "CIP" },
      user,
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      body: { error: "Cannot modify cleaning records for retired equipment" },
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("listAuditEntries", () => {
  const createdAt = new Date("2026-01-16T08:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    cleaningRecordFindFirst.mockResolvedValue({ id: "rec-1" });
    auditFindMany.mockResolvedValue([
      { id: "audit-1", action: "CREATE", createdAt },
    ]);
  });

  it("returns cursor-paginated audit entries", async () => {
    const result = await listAuditEntries("eq-1", "rec-1", { limit: 5 });

    expect(auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cleaningRecordId: "rec-1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 6,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        items: [{ id: "audit-1", action: "CREATE" }],
        pageInfo: {
          hasNextPage: false,
          endCursor: encodeCursor(createdAt, "audit-1"),
        },
      },
    });
  });

  it("returns 404 when the record does not exist", async () => {
    cleaningRecordFindFirst.mockResolvedValue(null);

    const result = await listAuditEntries("eq-1", "missing", { limit: 20 });

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Cleaning record not found" },
    });
    expect(auditFindMany).not.toHaveBeenCalled();
  });
});
