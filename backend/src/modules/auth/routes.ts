import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { loginSchema } from "./schemas";
import { login } from "./service";

const router = Router();

router.post("/login", validateBody(loginSchema), async (req, res) => {
  try {
    const result = await login(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("POST /auth/login failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.json(req.user);
});

export default router;
