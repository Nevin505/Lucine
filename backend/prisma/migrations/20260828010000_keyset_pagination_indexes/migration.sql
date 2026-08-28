-- CreateIndex
CREATE INDEX "cleaning_records_equipmentId_cleanedAt_id_idx" ON "cleaning_records"("equipmentId", "cleanedAt", "id");

-- CreateIndex
CREATE INDEX "audit_entries_cleaningRecordId_createdAt_id_idx" ON "audit_entries"("cleaningRecordId", "createdAt", "id");
