import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

/**
 * Shape of every response returned by the TrustCoin backend
 * (see src/utils/apiResponse.ts on the server).
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  messageKey?: string | null;
  details?: unknown;
}

export const AUTH_TOKEN_STORAGE_KEY = "trustcoin_token";

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/**
 * Shared Axios instance for every request to the TrustCoin backend.
 * - Automatically attaches the JWT (`Authorization: Bearer <token>`) once the
 *   user is logged in.
 * - Forwards the active UI language via the `x-lang` header so the backend
 *   returns messages (and OTP emails) in the same language as the UI.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  // Free-tier Render cold starts can exceed 15s; keep headroom for register/upload.
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const ID_REUPLOAD_SESSION_KEY = "trustcoin_id_reupload";
const ID_REUPLOAD_SESSION_MAX_MS = 48 * 60 * 60 * 1000;

function readRequestEmail(config?: InternalAxiosRequestConfig): string {
  const raw = config?.data;
  if (!raw) return "";
  if (typeof FormData !== "undefined" && raw instanceof FormData) {
    const email = raw.get("email");
    return typeof email === "string" ? email.trim().toLowerCase() : "";
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as { email?: unknown };
      return typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    } catch {
      return "";
    }
  }
  if (typeof raw === "object" && raw !== null && "email" in raw) {
    const email = (raw as { email?: unknown }).email;
    return typeof email === "string" ? email.trim().toLowerCase() : "";
  }
  return "";
}

function isIdReuploadRequested(details: unknown): boolean {
  return Boolean(
    details &&
      typeof details === "object" &&
      (details as { idReuploadRequested?: unknown }).idReuploadRequested === true
  );
}

export function markIdReuploadSession(email: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    ID_REUPLOAD_SESSION_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), at: Date.now() })
  );
}

export function clearIdReuploadSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ID_REUPLOAD_SESSION_KEY);
}

export function getIdReuploadSession(): { email: string } | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ID_REUPLOAD_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { email?: unknown; at?: unknown };
    if (typeof parsed.email !== "string" || !parsed.email.trim()) return null;
    if (typeof parsed.at === "number" && Date.now() - parsed.at > ID_REUPLOAD_SESSION_MAX_MS) {
      sessionStorage.removeItem(ID_REUPLOAD_SESSION_KEY);
      return null;
    }
    return { email: parsed.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAuthToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  // FormData must keep the browser-generated multipart boundary.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }

  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (lang) {
      config.headers.set("x-lang", lang);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const messageKey = error.response?.data?.messageKey ?? "";

    // Clear session on invalid token, or when the account is blocked/pending
    // so a frozen user cannot keep using a stale UI session.
    if (
      status === 401 ||
      (status === 403 &&
        (messageKey === "auth.account_suspended" || messageKey === "auth.account_pending"))
    ) {
      setStoredAuthToken(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("trustcoin_user");

        const path = window.location.pathname;
        const isAuthPage =
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/forgot-password") ||
          path.startsWith("/reset-password") ||
          path.startsWith("/already-registered") ||
          path.startsWith("/account-pending") ||
          path.startsWith("/secret-admin-portal/login");

        if (messageKey === "auth.account_pending") {
          const email = readRequestEmail(error.config);
          if (isIdReuploadRequested(error.response?.data?.details) && email) {
            markIdReuploadSession(email);
          } else if (email) {
            clearIdReuploadSession();
          }
          if (!path.startsWith("/account-pending")) {
            window.location.replace("/account-pending/");
          }
        } else if (!isAuthPage) {
          if (messageKey === "auth.account_suspended") {
            window.location.replace("/login/?reason=suspended");
          } else {
            const next = encodeURIComponent(path + window.location.search);
            window.location.replace(`/login/?next=${next}&reason=session`);
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Message shown when a request never reached the backend at all (server
 * down, wrong port, no network, etc.) — as opposed to a request that *did*
 * reach the server but was rejected (invalid credentials, validation, ...).
 * Mirrors `common.backendUnreachable` in the translation files; duplicated
 * here because this is a plain module function with no access to the
 * request-scoped i18n context that React components use.
 */
const BACKEND_UNREACHABLE_MESSAGE: Record<string, string> = {
  en: "Could not reach the server. Please check your connection and try again.",
  ar: "تعذر الوصول إلى الخادم. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
};

function getBackendUnreachableMessage(): string {
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "en";
  return BACKEND_UNREACHABLE_MESSAGE[lang] ?? BACKEND_UNREACHABLE_MESSAGE.en;
}

function detailsSummary(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const record = details as { summary?: unknown; fieldErrors?: Record<string, string[] | undefined> };
  if (typeof record.summary === "string" && record.summary.trim()) {
    return record.summary.trim();
  }
  if (record.fieldErrors) {
    const first = Object.values(record.fieldErrors)
      .flat()
      .find((value) => typeof value === "string" && value.trim());
    if (first) return first;
  }
  return null;
}

/** Extracts a human-readable, already-translated message from an Axios error. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    const summary = detailsSummary(data?.details);
    if (data?.message && summary) {
      return `${data.message} (${summary})`;
    }
    if (data?.message) {
      return data.message;
    }

    // The request was sent but no response ever came back (server down,
    // network dropped, CORS block, timeout, ...) — a generic "unexpected
    // error" message here is misleading, since the app itself didn't fail.
    if (error.request) {
      return getBackendUnreachableMessage();
    }
  }
  return fallback;
}

/** Stable backend message key when present (e.g. `auth.account_not_verified`). */
export function getApiErrorKey(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.messageKey ?? null;
  }
  return null;
}
