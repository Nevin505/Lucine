import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import type { AuthUser } from "../types/express";

type JwtPayload = {
  sub: string;
};

export const AUTH_COOKIE_NAME = "token";

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Check your .env file.");
  }
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: "7d" });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearerToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
