import type { SignInResponse } from "@/features/auth/types/auth";

const ACCESS_TOKEN_KEY = "vietflood_access_token";
const REFRESH_TOKEN_KEY = "vietflood_refresh_token";
const ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

type TokenPayload = {
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  exp?: number;
};

export type AuthIdentity = {
  username: string;
  displayName: string;
  initials: string;
  role?: string;
};

let cachedIdentityToken: string | null = null;
let cachedIdentity: AuthIdentity | null = null;

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie ? document.cookie.split(";") : [];

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length));
    }
  }

  return null;
}

function clearCookie(name: string): void {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function persistAuthTokens(tokens: SignInResponse): void {
  if (typeof window === "undefined") {
    return;
  }

  setCookie(
    ACCESS_TOKEN_KEY,
    tokens.accessToken,
    ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS,
  );
  // Backward-compatible fallback for old sessions.
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

  // Store refresh token if provided
  if (tokens.refresh_token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearCookie(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Remove legacy refresh token storage if it exists from older builds.
  window.localStorage.removeItem("vietflood_refresh_token");
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    getCookie(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function updateAccessToken(accessToken: string): void {
  if (typeof window === "undefined") {
    return;
  }

  setCookie(ACCESS_TOKEN_KEY, accessToken, ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS);
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function updateRefreshToken(refreshToken: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function decodeTokenPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = normalizedBase64.padEnd(
      Math.ceil(normalizedBase64.length / 4) * 4,
      "=",
    );
    const decoded = atob(paddedBase64);
    const payload = JSON.parse(decoded) as TokenPayload;

    return payload;
  } catch {
    return null;
  }
}

function createInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${second}`.toUpperCase();
}

export function getAuthIdentity(): AuthIdentity | null {
  const token = getAccessToken();
  if (!token) {
    cachedIdentityToken = null;
    cachedIdentity = null;
    return null;
  }

  if (cachedIdentityToken === token) {
    return cachedIdentity;
  }

  const payload = decodeTokenPayload(token);
  if (!payload?.username) {
    cachedIdentityToken = token;
    cachedIdentity = null;
    return null;
  }

  const fullName =
    `${payload.first_name ?? ""} ${payload.last_name ?? ""}`.trim();
  const displayName = fullName.length > 0 ? fullName : payload.username;

  cachedIdentityToken = token;
  cachedIdentity = {
    username: payload.username,
    displayName,
    initials: createInitials(displayName),
    role: payload.role,
  };

  return cachedIdentity;
}

/**
 * Check if the access token has already expired
 */
export function isAccessTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) {
    return true;
  }

  const payload = decodeTokenPayload(token);
  if (!payload?.exp) {
    return false; // Can't determine, assume valid
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

/**
 * Check if the access token is expiring soon (within 60 seconds)
 * Returns true if expired or expiring within 60 seconds
 */
export function isAccessTokenExpiringSoon(bufferSeconds: number = 60): boolean {
  const token = getAccessToken();
  if (!token) {
    return true;
  }

  const payload = decodeTokenPayload(token);
  if (!payload?.exp) {
    return false; // Can't determine, assume valid
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + bufferSeconds;
}
