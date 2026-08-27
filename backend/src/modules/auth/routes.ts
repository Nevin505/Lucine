import { Router } from "express";
import {
  authCookieOptions,
  AUTH_COOKIE_NAME,
  requireAuth,
} from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { loginSchema } from "./schemas";
import { login } from "./service";

const router = Router();

router.post("/login", validateBody(loginSchema), async (req, res) => {
  try {
    const result = await login(req.body);
    if (result.ok) {
      res.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions);
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("POST /auth/login failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
  return res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json(req.user);
});

export default router;
