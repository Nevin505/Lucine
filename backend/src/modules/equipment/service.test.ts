import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCursor } from "../../lib/pagination";
import { Prisma } from "../../generated/prisma/client";

const {
  findMany,
  findUnique,
  create,
  update,
  deleteFn,
  cleaningRecordCount,
} = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteFn: vi.fn(),
  cleaningRecordCount: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    equipment: {
      findMany,
      findUnique,
      create,
      update,
      delete: deleteFn,
    },
    cleaningRecord: { count: cleaningRecordCount },
  },
}));

import {
  createEquipment,
  deleteEquipment,
  getEquipment,
  listEquipment,
  updateEquipment,
} from "./service";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("mock error", {
    code,
    clientVersion: "7.10.0",
  });
}

const createdAt = new Date("2026-01-15T10:00:00.000Z");

describe("listEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "eq-1", name: "Tank A", createdAt }]);
  });

  it("fetches the first page with limit + 1", async () => {
    const result = await listEquipment({ limit: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 11,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        items: [{ id: "eq-1", name: "Tank A", createdAt }],
        pageInfo: {
          hasNextPage: false,
          endCursor: encodeCursor(createdAt, "eq-1"),
        },
      },
    });
  });

  it("applies a cursor filter when provided", async () => {
    const cursor = encodeCursor(createdAt, "eq-1");

    await listEquipment({ limit: 10, cursor });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
        take: 11,
      }),
    );
  });

  it("returns hasNextPage when an extra row is fetched", async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 4 }, (_, i) => ({
        id: `eq-${i}`,
        name: `Tank ${i}`,
        createdAt,
      })),
    );

    const result = await listEquipment({ limit: 3 });

    expect(result.body.items).toHaveLength(3);
    expect(result.body.pageInfo.hasNextPage).toBe(true);
  });

  it("filters by status when provided", async () => {
    await listEquipment({ limit: 20, status: "RETIRED" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "RETIRED" }),
      }),
    );
  });

  it("filters by name when provided", async () => {
    await listEquipment({ limit: 20, name: "auto" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "auto", mode: "insensitive" },
        }),
      }),
    );
  });

  it("returns 400 for an invalid cursor", async () => {
    const result = await listEquipment({ limit: 10, cursor: "not-a-cursor" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      body: { error: "Invalid cursor" },
    });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("getEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns equipment with cleaning record count", async () => {
    findUnique.mockResolvedValue({
      id: "eq-1",
      name: "Tank A",
      code: "TANK-A",
      status: "ACTIVE",
      _count: { cleaningRecords: 3 },
    });

    const result = await getEquipment("eq-1");

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        id: "eq-1",
        name: "Tank A",
        cleaningRecordCount: 3,
      },
    });
    expect(result.body).not.toHaveProperty("_count");
  });

  it("returns 404 when equipment does not exist", async () => {
    findUnique.mockResolvedValue(null);

    const result = await getEquipment("missing");

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Equipment not found" },
    });
  });
});

describe("createEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({
      id: "eq-new",
      name: "Tank B",
      code: "TANK-B",
      status: "ACTIVE",
    });
  });

  it("creates equipment", async () => {
    const result = await createEquipment({
      name: "Tank B",
      code: "TANK-B",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Tank B", code: "TANK-B" },
      }),
    );
    expect(result).toMatchObject({ ok: true, status: 201 });
  });

  it("returns 409 when code already exists", async () => {
    create.mockRejectedValue(prismaError("P2002"));

    const result = await createEquipment({
      name: "Tank B",
      code: "TANK-B",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      body: { error: "Equipment code already exists" },
    });
  });
});

describe("updateEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({
      id: "eq-1",
      name: "Tank A Updated",
      code: "TANK-A",
      status: "ACTIVE",
    });
  });

  it("updates equipment", async () => {
    const result = await updateEquipment("eq-1", { name: "Tank A Updated" });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "eq-1" },
        data: { name: "Tank A Updated" },
      }),
    );
    expect(result).toMatchObject({ ok: true, status: 200 });
  });

  it("returns 404 when equipment does not exist", async () => {
    update.mockRejectedValue(prismaError("P2025"));

    const result = await updateEquipment("missing", { name: "Tank A Updated" });

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Equipment not found" },
    });
  });

  it("returns 409 when code already exists", async () => {
    update.mockRejectedValue(prismaError("P2002"));

    const result = await updateEquipment("eq-1", { code: "TANK-C" });

    expect(result).toEqual({
      ok: false,
      status: 409,
      body: { error: "Equipment code already exists" },
    });
  });
});

describe("deleteEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({ id: "eq-1" });
    cleaningRecordCount.mockResolvedValue(0);
    deleteFn.mockResolvedValue(undefined);
  });

  it("deletes equipment with no cleaning history", async () => {
    const result = await deleteEquipment("eq-1");

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: "eq-1" } });
    expect(result).toEqual({ ok: true, status: 204 });
  });

  it("returns 404 when equipment does not exist", async () => {
    findUnique.mockResolvedValue(null);

    const result = await deleteEquipment("missing");

    expect(result).toEqual({
      ok: false,
      status: 404,
      body: { error: "Equipment not found" },
    });
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("returns 409 when equipment has cleaning history", async () => {
    cleaningRecordCount.mockResolvedValue(2);

    const result = await deleteEquipment("eq-1");

    expect(result).toEqual({
      ok: false,
      status: 409,
      body: {
        error:
          "Equipment has cleaning history and cannot be deleted. Retire it instead.",
      },
    });
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
