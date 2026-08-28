import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client";

const {
  findMany,
  count,
  findUnique,
  create,
  update,
  deleteFn,
  cleaningRecordCount,
} = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
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
      count,
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

describe("listEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "eq-1", name: "Tank A" }]);
    count.mockResolvedValue(1);
  });

  it("returns paginated equipment", async () => {
    const result = await listEquipment({ page: 2, pageSize: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { name: "asc" },
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      body: {
        page: 2,
        pageSize: 10,
        total: 1,
        items: [{ id: "eq-1", name: "Tank A" }],
      },
    });
  });

  it("filters by status when provided", async () => {
    await listEquipment({ page: 1, pageSize: 20, status: "RETIRED" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "RETIRED" },
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { status: "RETIRED" } });
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
