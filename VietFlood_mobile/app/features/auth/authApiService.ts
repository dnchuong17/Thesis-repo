/**
 * Auth API Service - Adapter layer between mobile app and FE auth API
 *
 * This service handles the FE-equivalent auth API contract including:
 * - Sign-in with username/password (adapting from mobile email field)
 * - Token response parsing (camelCase and snake_case variants)
 * - Profile fetching for role extraction
 * - Error message extraction with Vietnamese fallbacks
 */

import type { AuthSession, UserRole } from "@/features/shared"

export interface AuthApiSignInRequest {
  username: string // FE API expects 'username'
  password: string
}

export interface AuthApiResponse {
  accessToken?: string // Prefer camelCase
  access_token?: string // Fallback snake_case variant
  refresh_token?: string // Refresh token (optional)
  refreshToken?: string // Camelcase variant
}

export interface AuthApiProfile {
  role?: string
  [key: string]: unknown
}

// Configuration - should be moved to config.ts in production
const AUTH_API_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_API_BASE_URL || "https://vietflood-app.azurewebsites.net"
const SIGN_IN_ENDPOINT = "/auth/sign_in"
const PROFILE_ENDPOINT = "/auth/profile"
const REFRESH_TOKEN_ENDPOINT = "/auth/refresh_token"

// Development mock mode - set to true to skip backend and use mock auth
const USE_MOCK_AUTH = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true"

/**
 * Mock authentication for development - bypasses backend
 */
function mockSignIn(email: string): AuthSession {
  const role = email.includes("relief") || email.includes("coordinator") ? "relief" : "user"

  return {
    token: `mock-token-${Date.now()}`,
    email: email.trim(),
    role,
    signedInAt: new Date().toISOString(),
  }
}

/**
 * Extract error message from API response with Vietnamese fallback
 */
function extractErrorMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) {
      return message
    }
  }

  // Vietnamese fallback (matching FE)
  return "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản."
}

/**
 * Parse authentication response, handling both camelCase and snake_case tokens
 */
function parseAuthResponse(data: unknown): { accessToken: string; refreshToken?: string } {
  if (typeof data !== "object" || data === null) {
    if (__DEV__) {
      console.error("[auth] Invalid response:", data)
    }
    throw new Error("Phản hồi đăng nhập không hợp lệ từ máy chủ.")
  }

  const response = data as AuthApiResponse

  // Try camelCase first, then snake_case
  const accessToken = response.accessToken || response.access_token
  const refreshToken = response.refresh_token || response.refreshToken

  if (!accessToken || typeof accessToken !== "string" || accessToken.trim().length === 0) {
    if (__DEV__) {
      console.error("[auth] Missing or empty access token. Response keys:", Object.keys(response))
      console.error("[auth] Full response:", JSON.stringify(response, null, 2))
    }
    throw new Error("Không nhận được access token từ máy chủ.")
  }

  return {
    accessToken: accessToken.trim(),
    refreshToken:
      refreshToken && typeof refreshToken === "string" ? refreshToken.trim() : undefined,
  }
}

/**
 * Normalize role from profile response
 */
function normalizeRole(roleValue?: unknown): UserRole {
  if (typeof roleValue !== "string") return "guest"

  const normalized = roleValue.trim().toLowerCase()
  switch (normalized) {
    case "relief":
    case "user":
    case "resident":
    case "volunteer":
    case "coordinator":
    case "admin":
    case "guest":
      return normalized
    default:
      return "guest"
  }
}

/**
 * Sign in with email/password, returning session with token and role
 *
 * @param email - User email (will be sent as 'username' to FE API)
 * @param password - User password
 * @returns AuthSession with token and role
 * @throws Error with user-friendly message on failure
 */
export async function signInViaFEApi(email: string, password: string): Promise<AuthSession> {
  try {
    // Validate input
    if (!email || email.trim().length === 0) {
      throw new Error("Please enter your email address.")
    }

    if (!password || password.length < 4) {
      throw new Error("Password is too short.")
    }

    // Use mock auth in development if enabled
    if (USE_MOCK_AUTH) {
      if (__DEV__) {
        console.log("[auth] Using mock authentication (EXPO_PUBLIC_USE_MOCK_AUTH=true)")
      }
      return mockSignIn(email)
    }

    // Call FE sign-in endpoint, adapting 'email' to FE 'username'
    const signInRequest: AuthApiSignInRequest = {
      username: email.trim(), // FE API expects 'username'
      password,
    }

    const signInResponse = await fetch(`${AUTH_API_BASE_URL}${SIGN_IN_ENDPOINT}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signInRequest),
    })

    const signInData = await signInResponse.json().catch(() => null)

    if (__DEV__) {
      console.log("[auth] Sign-in response status:", signInResponse.status)
      console.log("[auth] Sign-in response data:", JSON.stringify(signInData, null, 2))
    }

    if (!signInResponse.ok) {
      throw new Error(extractErrorMessage(signInData))
    }

    // Parse tokens from response
    const { accessToken, refreshToken: _refreshToken } = parseAuthResponse(signInData)

    // Fetch user profile to get role
    const profileResponse = await fetch(`${AUTH_API_BASE_URL}${PROFILE_ENDPOINT}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const profileData = await profileResponse.json().catch(() => null)

    if (!profileResponse.ok) {
      throw new Error(extractErrorMessage(profileData) || "Failed to fetch user profile.")
    }

    // Extract and normalize role
    const profile = profileData as AuthApiProfile
    const role = normalizeRole(profile?.role)

    // Build and return session (note: refreshToken stored separately if needed, not in base AuthSession)
    const session: AuthSession = {
      token: accessToken,
      email: email.trim(),
      role,
      signedInAt: new Date().toISOString(),
    }

    return session
  } catch (error) {
    // Re-throw with user context
    if (error instanceof Error) {
      throw error
    }
    throw new Error("An unexpected error occurred during sign-in.")
  }
}

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - The stored refresh token
 * @returns New AuthSession with refreshed token
 * @throws Error if refresh fails
 */
export async function refreshAccessTokenViaFEApi(refreshToken: string): Promise<AuthSession> {
  try {
    if (!refreshToken || refreshToken.trim().length === 0) {
      throw new Error("No refresh token available.")
    }

    const response = await fetch(`${AUTH_API_BASE_URL}${REFRESH_TOKEN_ENDPOINT}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(extractErrorMessage(data))
    }

    const { accessToken } = parseAuthResponse(data)
    // Return a basic authenticated session; caller will merge other details
    return {
      token: accessToken,
      email: "", // Caller should preserve email
      role: "guest",
      signedInAt: new Date().toISOString(),
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to refresh authentication.")
  }
}

/**
 * Validate stored session by checking profile endpoint
 * Used for session restoration on app startup
 *
 * @param token - Stored access token
 * @returns true if token is valid and role can be fetched
 */
export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    if (!token || token.trim().length === 0) {
      return false
    }

    const response = await fetch(`${AUTH_API_BASE_URL}${PROFILE_ENDPOINT}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.ok
  } catch {
    return false
  }
}
