import { isAxiosError } from "axios";
import { z } from "zod";
import { api } from "./api";

export { clearToken, getToken, setToken } from "./token";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
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

export async function loginRequest(
  input: LoginInput,
): Promise<{ token: string; user: AuthUser }> {
  try {
    const { data } = await api.post<{ token: string; user: AuthUser }>(
      "/auth/login",
      input,
    );
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}

export async function meRequest(): Promise<AuthUser> {
  try {
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error });
  }
}
