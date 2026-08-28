import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import {
  createCleaningRecordSchema,
  listAuditEntriesQuerySchema,
  listCleaningRecordsQuerySchema,
  updateCleaningRecordSchema,
} from "./schemas";
import {
  createCleaningRecord,
  listAuditEntries,
  listCleaningRecords,
  updateCleaningRecord,
} from "./service";

const router = Router({ mergeParams: true });

function paramId(id: string | string[] | undefined): string {
  if (id === undefined) return "";
  return Array.isArray(id) ? id[0] : id;
}

function equipmentIdFrom(req: { params: Record<string, string | string[]> }) {
  return paramId(req.params.equipmentId);
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const equipmentId = equipmentIdFrom(req);
    const parsed = listCleaningRecordsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "query",
          message: issue.message,
        })),
      });
    }

    const result = await listCleaningRecords(equipmentId, parsed.data);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("GET /equipment/:equipmentId/cleaning-records failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", validateBody(createCleaningRecordSchema), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await createCleaningRecord(
      equipmentIdFrom(req),
      req.body,
      req.user,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("POST /equipment/:equipmentId/cleaning-records failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/audit-entries", async (req, res) => {
  try {
    const parsed = listAuditEntriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "query",
          message: issue.message,
        })),
      });
    }

    const result = await listAuditEntries(
      equipmentIdFrom(req),
      paramId(req.params.id),
      parsed.data,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(
      "GET /equipment/:equipmentId/cleaning-records/:id/audit-entries failed:",
      err,
    );
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/:id",
  validateBody(updateCleaningRecordSchema),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = await updateCleaningRecord(
        equipmentIdFrom(req),
        paramId(req.params.id),
        req.body,
        req.user,
      );
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error(
        "PATCH /equipment/:equipmentId/cleaning-records/:id failed:",
        err,
      );
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
