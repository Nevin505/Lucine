import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../middleware/auth";
import type { LoginInput } from "./schemas";

const invalidCredentials = { error: "Invalid email or password" as const };

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    return { ok: false as const, status: 401 as const, body: invalidCredentials };
  }

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) {
    return { ok: false as const, status: 401 as const, body: invalidCredentials };
  }

  const publicUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return {
    ok: true as const,
    status: 200 as const,
    body: {
      token: signToken(user.id),
      user: publicUser,
    },
  };
}
