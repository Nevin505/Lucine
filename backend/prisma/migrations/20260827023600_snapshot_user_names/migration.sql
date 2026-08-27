-- AlterTable: snapshot cleaner name, allow user delete
ALTER TABLE "cleaning_records" ADD COLUMN "cleanedByName" TEXT;

UPDATE "cleaning_records" AS c
SET "cleanedByName" = u."name"
FROM "users" AS u
WHERE c."cleanedById" = u."id";

UPDATE "cleaning_records"
SET "cleanedByName" = 'Unknown'
WHERE "cleanedByName" IS NULL;

ALTER TABLE "cleaning_records" ALTER COLUMN "cleanedByName" SET NOT NULL;

-- AlterTable: snapshot audit actor name, allow user delete
ALTER TABLE "audit_entries" ADD COLUMN "userName" TEXT;

UPDATE "audit_entries" AS a
SET "userName" = u."name"
FROM "users" AS u
WHERE a."userId" = u."id";

UPDATE "audit_entries"
SET "userName" = 'Unknown'
WHERE "userName" IS NULL;

ALTER TABLE "audit_entries" ALTER COLUMN "userName" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "cleaning_records" DROP CONSTRAINT "cleaning_records_equipmentId_fkey";
ALTER TABLE "cleaning_records" DROP CONSTRAINT "cleaning_records_cleanedById_fkey";
ALTER TABLE "audit_entries" DROP CONSTRAINT "audit_entries_cleaningRecordId_fkey";
ALTER TABLE "audit_entries" DROP CONSTRAINT "audit_entries_userId_fkey";

-- Make user FKs nullable
ALTER TABLE "cleaning_records" ALTER COLUMN "cleanedById" DROP NOT NULL;
ALTER TABLE "audit_entries" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey (history preserved; user delete nulls FKs but keeps names)
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_cleanedById_fkey" FOREIGN KEY ("cleanedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_cleaningRecordId_fkey" FOREIGN KEY ("cleaningRecordId") REFERENCES "cleaning_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
