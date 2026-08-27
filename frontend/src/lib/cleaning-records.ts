import { isAxiosError } from "axios";
import { z } from "zod";
import { api } from "./api";

export const cleaningRecordStatusSchema = z.enum(["PENDING", "VERIFIED"]);

export const createCleaningRecordSchema = z.object({
  cleanedAt: z.string().min(1, "Cleaned at is required"),
  method: z.string().trim().min(1, "Method is required"),
  notes: z.string().trim().optional(),
  status: cleaningRecordStatusSchema.optional(),
});

export const updateCleaningRecordSchema = z
  .object({
    cleanedAt: z.string().min(1, "Cleaned at is required").optional(),
    method: z.string().trim().min(1, "Method is required").optional(),
    notes: z.string().trim().optional(),
    status: cleaningRecordStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CleaningRecordStatus = z.infer<typeof cleaningRecordStatusSchema>;
export type CreateCleaningRecordInput = z.infer<
  typeof createCleaningRecordSchema
>;
export type UpdateCleaningRecordInput = z.infer<
  typeof updateCleaningRecordSchema
>;

export type CleaningRecord = {
  id: string;
  equipmentId: string;
  cleanedById: string | null;
  cleanedByName: string;
  cleanedAt: string;
  method: string;
  notes: string | null;
  status: CleaningRecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type CleaningRecordListResponse = {
  items: CleaningRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type ListCleaningRecordsParams = {
  status?: CleaningRecordStatus;
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

export async function listCleaningRecords(
  equipmentId: string,
  params: ListCleaningRecordsParams = {},
): Promise<CleaningRecordListResponse> {
  try {
    const { data } = await api.get<CleaningRecordListResponse>(
      `/equipment/${equipmentId}/cleaning-records`,
      { params },
    );
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function createCleaningRecord(
  equipmentId: string,
  input: CreateCleaningRecordInput,
): Promise<CleaningRecord> {
  try {
    const { data } = await api.post<CleaningRecord>(
      `/equipment/${equipmentId}/cleaning-records`,
      input,
    );
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function updateCleaningRecord(
  equipmentId: string,
  id: string,
  input: UpdateCleaningRecordInput,
): Promise<CleaningRecord> {
  try {
    const { data } = await api.patch<CleaningRecord>(
      `/equipment/${equipmentId}/cleaning-records/${id}`,
      input,
    );
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}
