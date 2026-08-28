import { z } from "zod";

const equipmentStatusSchema = z.enum(["ACTIVE", "RETIRED"]);

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  status: equipmentStatusSchema.optional(),
});

export const updateEquipmentSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    code: z.string().trim().min(1, "Code is required").optional(),
    status: equipmentStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const listEquipmentQuerySchema = z.object({
  status: equipmentStatusSchema.optional(),
  name: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type ListEquipmentQuery = z.infer<typeof listEquipmentQuerySchema>;
