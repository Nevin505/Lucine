import { z } from "zod";

const cleaningRecordStatusSchema = z.enum(["PENDING", "VERIFIED"]);

export const createCleaningRecordSchema = z.object({
  cleanedAt: z.coerce.date(),
  method: z.string().trim().min(1, "Method is required"),
  notes: z.string().trim().optional(),
  status: cleaningRecordStatusSchema.optional(),
});

export const updateCleaningRecordSchema = z
  .object({
    cleanedAt: z.coerce.date().optional(),
    method: z.string().trim().min(1, "Method is required").optional(),
    notes: z.string().trim().optional(),
    status: cleaningRecordStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const listCleaningRecordsQuerySchema = z.object({
  status: cleaningRecordStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateCleaningRecordInput = z.infer<
  typeof createCleaningRecordSchema
>;
export type UpdateCleaningRecordInput = z.infer<
  typeof updateCleaningRecordSchema
>;
export type ListCleaningRecordsQuery = z.infer<
  typeof listCleaningRecordsQuerySchema
>;
