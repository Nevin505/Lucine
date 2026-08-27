import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "operator@example.com";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Demo Operator",
      role: "OPERATOR",
      passwordHash,
    },
    create: {
      email,
      name: "Demo Operator",
      role: "OPERATOR",
      passwordHash,
    },
  });

  console.log("Seeded user:", {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    password,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
