import { isAxiosError } from "axios";
import { z } from "zod";
import { api } from "./api";

export const equipmentStatusSchema = z.enum(["ACTIVE", "RETIRED"]);

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

export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;

export type Equipment = {
  id: string;
  name: string;
  code: string;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentDetail = Equipment & {
  cleaningRecordCount: number;
};

export type EquipmentListResponse = {
  items: Equipment[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListEquipmentParams = {
  status?: EquipmentStatus;
  page?: number;
  pageSize?: number;
};

type ApiErrorBody = {
  error?: string;
  details?: Array<{ field: string; message: string }>;
};

function parseApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.details?.length) {
      return body.details.map((d) => d.message).join(". ");
    }
    if (body?.error) {
      return body.error;
    }
    if (error.response?.status) {
      return `Request failed (${error.response.status})`;
    }
  }

  return error instanceof Error ? error.message : "Request failed";
}

export async function listEquipment(
  params: ListEquipmentParams = {},
): Promise<EquipmentListResponse> {
  try {
    const { data } = await api.get<EquipmentListResponse>("/equipment", {
      params,
    });
    return data;
  } catch (error) {
    console.error("Error listing equipment", error);
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function getEquipment(id: string): Promise<EquipmentDetail> {
  try {
    const { data } = await api.get<EquipmentDetail>(`/equipment/${id}`);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function createEquipment(
  input: CreateEquipmentInput,
): Promise<Equipment> {
  try {
    const { data } = await api.post<Equipment>("/equipment", input);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function updateEquipment(
  id: string,
  input: UpdateEquipmentInput,
): Promise<Equipment> {
  try {
    const { data } = await api.patch<Equipment>(`/equipment/${id}`, input);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function deleteEquipment(id: string): Promise<void> {
  try {
    await api.delete(`/equipment/${id}`);
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}
