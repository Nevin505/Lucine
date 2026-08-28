import { describe, expect, it } from "vitest";
import { buildAuditChanges } from "./audit-changes";

const existing = {
  cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
  method: "Steam",
  notes: "Initial pass",
  status: "PENDING" as const,
};

describe("buildAuditChanges", () => {
  it("returns an empty diff when no fields are provided", () => {
    expect(buildAuditChanges(existing, {})).toEqual({});
  });

  it("records a single field change with from and to values", () => {
    expect(buildAuditChanges(existing, { method: "CIP" })).toEqual({
      method: { from: "Steam", to: "CIP" },
    });
  });

  it("captures multiple field transitions", () => {
    const nextCleanedAt = new Date("2026-01-16T14:30:00.000Z");

    expect(
      buildAuditChanges(existing, {
        cleanedAt: nextCleanedAt,
        status: "VERIFIED",
        notes: "Supervisor sign-off",
      }),
    ).toEqual({
      cleanedAt: { from: existing.cleanedAt, to: nextCleanedAt },
      notes: { from: "Initial pass", to: "Supervisor sign-off" },
      status: { from: "PENDING", to: "VERIFIED" },
    });
  });

  it("tracks clearing notes when updated to an empty string", () => {
    expect(buildAuditChanges(existing, { notes: "" })).toEqual({
      notes: { from: "Initial pass", to: "" },
    });
  });

  it("does not include unchanged fields omitted from the update payload", () => {
    const changes = buildAuditChanges(existing, { method: "Foam" });

    expect(Object.keys(changes)).toEqual(["method"]);
    expect(changes).not.toHaveProperty("status");
    expect(changes).not.toHaveProperty("cleanedAt");
  });
});
