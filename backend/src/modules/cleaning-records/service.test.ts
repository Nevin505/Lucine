import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  equipmentFindUnique,
  cleaningRecordFindMany,
  cleaningRecordCount,
  cleaningRecordFindFirst,
  txCreate,
  txUpdate,
  auditCreate,
  auditFindMany,
  auditCount,
  transaction,
} = vi.hoisted(() => ({
  equipmentFindUnique: vi.fn(),
  cleaningRecordFindMany: vi.fn(),
  cleaningRecordCount: vi.fn(),
  cleaningRecordFindFirst: vi.fn(),
  txCreate: vi.fn(),
  txUpdate: vi.fn(),
  auditCreate: vi.fn(),
  auditFindMany: vi.fn(),
  auditCount: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    equipment: { findUnique: equipmentFindUnique },
    cleaningRecord: {
      findMany: cleaningRecordFindMany,
      count: cleaningRecordCount,
      findFirst: cleaningRecordFindFirst,
    },
    auditEntry: {
      findMany: auditFindMany,
      count: auditCount,
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

describe("listCleaningRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipmentFindUnique.mockResolvedValue({ id: "eq-1", status: "ACTIVE" });
    cleaningRecordFindMany.mockResolvedValue([{ id: "rec-2" }]);
    cleaningRecordCount.mockResolvedValue(25);
  });

  it("applies skip and take from page and pageSize", async () => {
    const result = await listCleaningRecords("eq-1", {
      page: 3,
      pageSize: 10,
    });

    expect(cleaningRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        page: 3,
        pageSize: 10,
        total: 25,
        items: [{ id: "rec-2" }],
      },
    });
  });

  it("filters by status when provided", async () => {
    await listCleaningRecords("eq-1", {
      page: 1,
      pageSize: 20,
      status: "VERIFIED",
    });

    expect(cleaningRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { equipmentId: "eq-1", status: "VERIFIED" },
        skip: 0,
        take: 20,
      }),
    );
    expect(cleaningRecordCount).toHaveBeenCalledWith({
      where: { equipmentId: "eq-1", status: "VERIFIED" },
    });
  });

  it("returns 404 when equipment does not exist", async () => {
    equipmentFindUnique.mockResolvedValue(null);

    const result = await listCleaningRecords("missing", {
      page: 1,
      pageSize: 20,
    });

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
  beforeEach(() => {
    vi.clearAllMocks();
    cleaningRecordFindFirst.mockResolvedValue({ id: "rec-1" });
    auditFindMany.mockResolvedValue([{ id: "audit-1", action: "CREATE" }]);
    auditCount.mockResolvedValue(1);
  });

  it("returns paginated audit entries for a record", async () => {
    const result = await listAuditEntries("eq-1", "rec-1", {
      page: 2,
      pageSize: 5,
    });

    expect(auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cleaningRecordId: "rec-1" },
        skip: 5,
        take: 5,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        page: 2,
        pageSize: 5,
        total: 1,
        items: [{ id: "audit-1", action: "CREATE" }],
      },
    });
  });

  it("returns 404 when the record does not exist", async () => {
    cleaningRecordFindFirst.mockResolvedValue(null);

    const result = await listAuditEntries("eq-1", "missing", {
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Cleaning record not found" },
    });
    expect(auditFindMany).not.toHaveBeenCalled();
  });
});
