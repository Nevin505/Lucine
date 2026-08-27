import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import cleaningRecordRoutes from "../cleaning-records/routes";
import {
  createEquipmentSchema,
  listEquipmentQuerySchema,
  updateEquipmentSchema,
} from "./schemas";
import {
  createEquipment,
  deleteEquipment,
  getEquipment,
  listEquipment,
  updateEquipment,
} from "./service";

const router = Router();

function paramId(id: string | string[]): string {
  return Array.isArray(id) ? id[0] : id;
}

router.use(requireAuth);

router.use("/:equipmentId/cleaning-records", cleaningRecordRoutes);

router.get("/", async (req, res) => {
  try {
    const parsed = listEquipmentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "query",
          message: issue.message,
        })),
      });
    }

    const result = await listEquipment(parsed.data);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("GET /equipment failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await getEquipment(paramId(req.params.id));
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("GET /equipment/:id failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", validateBody(createEquipmentSchema), async (req, res) => {
  try {
    const result = await createEquipment(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("POST /equipment failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", validateBody(updateEquipmentSchema), async (req, res) => {
  try {
    const result = await updateEquipment(paramId(req.params.id), req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("PATCH /equipment/:id failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteEquipment(paramId(req.params.id));
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("DELETE /equipment/:id failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
