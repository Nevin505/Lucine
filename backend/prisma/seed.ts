import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const DEFAULT_PASSWORD = "password123";

type SeedUser = {
  email: string;
  name: string;
};

type SeedEquipment = {
  name: string;
  code: string;
  status: "ACTIVE" | "RETIRED";
};

const USERS: SeedUser[] = [
  { email: "operator@example.com", name: "Demo Operator" },
  { email: "maria.santos@example.com", name: "Maria Santos" },
  { email: "james.chen@example.com", name: "James Chen" },
  { email: "priya.patel@example.com", name: "Priya Patel" },
  { email: "leo.martin@example.com", name: "Leo Martin" },
];


const EQUIPMENT: SeedEquipment[] = [
  { name: "Bioreactor 500L", code: "BR-500-01", status: "ACTIVE" },
  { name: "Centrifuge CF-220", code: "CF-220", status: "ACTIVE" },
  { name: "Autoclave AC-015", code: "AC-015", status: "ACTIVE" },
  { name: "Mixing Vessel MV-402", code: "MV-402", status: "ACTIVE" },
  { name: "Filling Line FL-003", code: "FL-003", status: "RETIRED" },
  { name: "Chromatography Skid SK-118", code: "SK-118", status: "ACTIVE" },
  { name: "Tablet Press TP-09", code: "TP-09", status: "ACTIVE" },
  { name: "Clean Room Hood CRH-12", code: "CRH-12", status: "ACTIVE" },
  { name: "Homogenizer HM-77", code: "HM-77", status: "ACTIVE" },
  { name: "Freeze Dryer FD-204", code: "FD-204", status: "ACTIVE" },
  { name: "Granulator GR-18", code: "GR-18", status: "ACTIVE" },
  { name: "Coating Pan CP-05", code: "CP-05", status: "ACTIVE" },
  { name: "Vial Washer VW-44", code: "VW-44", status: "ACTIVE" },
  { name: "Packaging Line PK-11", code: "PK-11", status: "ACTIVE" },
  { name: "Buffer Prep Tank BT-301", code: "BT-301", status: "ACTIVE" },
  { name: "Sterile Filter SF-88", code: "SF-88", status: "ACTIVE" },
  { name: "Inspection Booth IB-02", code: "IB-02", status: "ACTIVE" },
  { name: "Water System WS-01", code: "WS-01", status: "ACTIVE" },
  { name: "Lyophilizer LY-33", code: "LY-33", status: "RETIRED" },
  { name: "HVAC Unit HVAC-07", code: "HVAC-07", status: "ACTIVE" },
];

const CLEANING_METHODS = [
  "CIP cycle",
  "Manual wipe-down",
  "Steam sterilization (SIP)",
  "Alcohol wipe",
  "Vacuum and compressed air purge",
  "Disassembly and sanitization",
  "HEPA surface wipe + UV cycle",
  "Column flush and sanitization",
  "Hot water rinse",
  "Detergent foam scrub",
];

function daysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}


async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = await Promise.all(
    USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: "OPERATOR",
          passwordHash,
        },
        create: {
          email: user.email,
          name: user.name,
          passwordHash,
        },
      }),
    ),
  );

  return Object.fromEntries(users.map((user) => [user.email, user]));
}

async function seedEquipment() {
  const items = await Promise.all(
    EQUIPMENT.map((item) =>
      prisma.equipment.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          status: item.status,
        },
        create: {
          name: item.name,
          code: item.code,
          status: item.status,
        },
      }),
    ),
  );

  return Object.fromEntries(items.map((item) => [item.code, item]));
}

const EQUIPMENT_NOTES: Record<string, string[]> = {
  "BR-500-01": ["Post-batch turnover clean", "Harvest line flushed"],
  "CF-220": ["Rotor inspected — no residue", "Bowl gasket replaced after clean"],
  "AC-015": ["Cycle 121°C / 30 min", "Biological indicator passed"],
  "MV-402": ["Agitator seal checked", "Jacket drain verified"],
  "FL-003": ["Equipment retired after last batch"],
  "SK-118": ["Buffer B lines flushed twice", "Column pressure stable post-clean"],
  "TP-09": ["Punch set lubricated after clean"],
  "CRH-12": ["Pre-shift readiness check", "UV cycle completed"],
  "HM-77": ["Valve block disassembled and rinsed"],
  "FD-204": ["Condenser defrosted before sanitization"],
  "GR-18": ["Screen mesh inspected"],
  "CP-05": ["Pan spray nozzles cleared"],
  "VW-44": ["Needle bed soaked overnight"],
  "PK-11": ["Conveyor belts wiped down"],
  "BT-301": ["Tank agitator run during CIP"],
  "SF-88": ["Filter housing pressure tested"],
  "IB-02": ["Light booth glass cleaned both sides"],
  "WS-01": ["Loop sample sent to QC"],
  "LY-33": ["Final decommission clean before retirement"],
  "HVAC-07": ["HEPA pre-filter replaced"],
};

function buildCleaningRecords(users: Awaited<ReturnType<typeof seedUsers>>) {
  const operatorEmails = USERS.map((u) => u.email);
  let recordIndex = 0;

  return EQUIPMENT.flatMap((item, equipmentIndex) => {
    const recordCount = item.status === "RETIRED" ? 2 : 3;

    return Array.from({ length: recordCount }, (_, i) => {
      const operatorEmail = operatorEmails[recordIndex % operatorEmails.length];
      const operator = users[operatorEmail];
      const notesPool = EQUIPMENT_NOTES[item.code] ?? [];
      const daysBack = equipmentIndex * 3 + i * 2 + 1;
      recordIndex += 1;

      return {
        equipmentCode: item.code,
        operatorEmail,
        cleanedAt: daysAgo(daysBack, (8 + recordIndex * 3) % 24),
        method: CLEANING_METHODS[recordIndex % CLEANING_METHODS.length],
        notes: notesPool[i % notesPool.length] ?? null,
        status: (recordIndex % 5 === 0 ? "PENDING" : "VERIFIED") as
          | "PENDING"
          | "VERIFIED",
        cleanedBy: operator,
      };
    });
  });
}

async function seedCleaningData(
  users: Awaited<ReturnType<typeof seedUsers>>,
  equipment: Awaited<ReturnType<typeof seedEquipment>>,
) {
  const records = buildCleaningRecords(users);

  let createdRecords = 0;
  let createdAuditEntries = 0;

  for (const entry of records) {
    const eq = equipment[entry.equipmentCode];
    if (!eq || !entry.cleanedBy) continue;

    const existing = await prisma.cleaningRecord.findFirst({
      where: {
        equipmentId: eq.id,
        cleanedAt: entry.cleanedAt,
        method: entry.method,
      },
    });

    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const created = await tx.cleaningRecord.create({
        data: {
          equipmentId: eq.id,
          cleanedById: entry.cleanedBy.id,
          cleanedByName: entry.cleanedBy.name,
          cleanedAt: entry.cleanedAt,
          method: entry.method,
          notes: entry.notes,
          status: entry.status,
        },
      });

      await tx.auditEntry.create({
        data: {
          cleaningRecordId: created.id,
          userId: entry.cleanedBy.id,
          userName: entry.cleanedBy.name,
          action: "CREATE",
          changes: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    createdRecords += 1;
    createdAuditEntries += 1;
  }

  return { createdRecords, createdAuditEntries };
}

async function main() {
  const users = await seedUsers();
  const equipment = await seedEquipment();
  const { createdRecords, createdAuditEntries } = await seedCleaningData(
    users,
    equipment,
  );

  console.log("Seed complete.\n");
  console.log(`Users (password for all: ${DEFAULT_PASSWORD}):`);
  for (const user of USERS) {
    console.log(`  - ${user.email}`);
  }
  console.log(`\nEquipment: ${EQUIPMENT.length} items`);
  console.log(
    `Cleaning records: ${createdRecords} new (${createdAuditEntries} audit entries)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
