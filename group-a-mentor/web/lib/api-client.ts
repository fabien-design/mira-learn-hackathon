import { getAccessToken } from "@/lib/supabase";

/**
 * API client custom — wrapper fetch avec JWT auto-injection.
 *
 * Convention hackathon :
 *   - GET / POST / PATCH / DELETE
 *   - JWT Supabase auto en Authorization header
 *   - Format réponses JSend `{status, data, message}`
 *   - Erreurs typées : `ApiError`
 *
 * 🚨 MIGRATION HINT CRITIQUE (post-hackathon) 🚨
 *
 *   Ce client custom est **complètement remplacé** par `@hlmr-travel/sdk-js` :
 *
 *     import { HlmrClient } from "@hlmr-travel/sdk-js";
 *
 *     const sdk = new HlmrClient({
 *       baseUrl: process.env.NEXT_PUBLIC_API_URL,
 *       getToken: () => getAccessToken(),
 *     });
 *
 *     // Usage typé :
 *     const offers = await sdk.offers.list();
 *     const profile = await sdk.users.me.get();
 *
 *   Le SDK officiel apporte :
 *     - Méthodes typées par domaine (sdk.classes.list(), sdk.mentors.get(...))
 *     - DTOs TypeScript générés depuis OpenAPI backbone
 *     - Retry exponentiel, timeout configurable
 *     - Token refresh auto sur 401
 *     - Pattern singleton via React hook `useHlmrClient()`
 *
 *   Voir `fronts/book-web/lib/sdk.ts` + `lib/api-client.ts` pour référence post-migration.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Base URL du backend FastAPI (utile pour les requêtes multipart custom). */
export function getApiUrl(): string {
  return API_URL;
}

/** Réponse JSend standard depuis le backend. */
export type JSendResponse<T = unknown> = {
  status: "success" | "fail" | "error";
  data: T;
  message: string | null;
};

/** Erreur typée renvoyée par les appels API. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: JSendResponse<T> | null = null;
  try {
    payload = (await response.json()) as JSendResponse<T>;
  } catch {
    // Réponse non-JSON (502, timeout) → erreur générique
  }

  if (!response.ok) {
    const message =
      payload?.message ?? `HTTP ${response.status} sur ${method} ${path}`;
    throw new ApiError(message, response.status, payload?.data ?? null);
  }

  if (!payload) {
    throw new ApiError(`Invalid JSON response sur ${method} ${path}`, response.status);
  }

  if (payload.status === "error" || payload.status === "fail") {
    throw new ApiError(payload.message ?? "Unknown error", response.status, payload.data);
  }

  return payload.data;
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
  });

  let payload: JSendResponse<T> | null = null;
  try {
    payload = (await response.json()) as JSendResponse<T>;
  } catch {
    // non-JSON response
  }

  if (!response.ok) {
    const message = payload?.message ?? `HTTP ${response.status} on POST ${path}`;
    throw new ApiError(message, response.status, payload?.data ?? null);
  }

  if (!payload) {
    throw new ApiError(`Invalid JSON response on POST ${path}`, response.status);
  }

  if (payload.status === "error" || payload.status === "fail") {
    throw new ApiError(payload.message ?? "Unknown error", response.status, payload.data);
  }

  return payload.data;
}

export const apiClient = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
  postForm: <T = unknown>(path: string, form: FormData) => requestForm<T>(path, form),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
};
