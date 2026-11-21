import axios, { AxiosError } from "axios";
import type { ApiEnvelope, PageMeta } from "@/types";

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ""}/api`,
  withCredentials: true,
  timeout: 30000,
});

/** Fires when any request comes back 401 so the auth context can clear the session. */
export const AUTH_EXPIRED_EVENT = "akh:auth-expired";
http.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const url = err.config?.url ?? "";
    if (err.response?.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/me")) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(err);
  },
);

export class ApiFailure extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function toFailure(e: unknown): ApiFailure {
  if (e instanceof ApiFailure) return e;
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as { error?: { message?: string; code?: string; details?: unknown } } | undefined;
    if (body?.error?.message) return new ApiFailure(body.error.message, e.response!.status, body.error.code, body.error.details);
    if (!e.response) return new ApiFailure("Can't reach the server. Check your connection and try again.", 0);
    return new ApiFailure(`Request failed (${e.response.status})`, e.response.status);
  }
  return new ApiFailure(e instanceof Error ? e.message : "Unexpected error", 0);
}

export function errorMessage(e: unknown): string {
  return toFailure(e).message;
}

async function wrap<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    return (await p).data.data;
  } catch (e) {
    throw toFailure(e);
  }
}

async function wrapPage<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<{ data: T; meta: PageMeta }> {
  try {
    const r = (await p).data;
    return { data: r.data, meta: r.meta as PageMeta };
  } catch (e) {
    throw toFailure(e);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;
const clean = (p?: Params) => Object.fromEntries(Object.entries(p ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const api = {
  get: <T>(url: string, params?: Params) => wrap<T>(http.get(url, { params: clean(params) })),
  page: <T>(url: string, params?: Params) => wrapPage<T>(http.get(url, { params: clean(params) })),
  post: <T>(url: string, body?: unknown) => wrap<T>(http.post(url, body ?? {})),
  patch: <T>(url: string, body: unknown) => wrap<T>(http.patch(url, body)),
  put: <T>(url: string, body: unknown) => wrap<T>(http.put(url, body)),
  del: <T>(url: string) => wrap<T>(http.delete(url)),
  upload: <T>(url: string, form: FormData) => wrap<T>(http.post(url, form)),
};

/** Downloads a PDF (receipt) via the authenticated session. */
export async function downloadFile(url: string, filename: string) {
  try {
    const res = await http.get(url, { responseType: "blob" });
    const href = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
      const text = await (e.response.data as Blob).text();
      try {
        throw new ApiFailure(JSON.parse(text).error.message, e.response.status);
      } catch (inner) {
        if (inner instanceof ApiFailure) throw inner;
      }
    }
    throw toFailure(e);
  }
}
