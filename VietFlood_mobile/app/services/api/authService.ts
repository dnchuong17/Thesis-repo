/**
 * Authentication service for handling all auth-related API calls
 * and token management.
 */
import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem"
import { clearTokens, getRefreshToken, saveActiveSessionTokens } from "./tokenStorage"
import type {
  AuthRefreshTokenRequest,
  AuthRefreshTokenResponse,
  AuthRegisterRequest,
  AuthRegisterResponse,
  AuthSignInRequest,
  AuthSignInResponse,
  UpdateUserProfileRequest,
  User,
} from "./types"
import { normalizeAuthResponse } from "./types"

import { Api } from "./index"

// Singleton instance of AuthService
import { api } from "./index"

export type AuthResult = { kind: "ok"; data: AuthSignInResponse } | GeneralApiProblem

export type RegisterResult = { kind: "ok"; data: AuthRegisterResponse } | GeneralApiProblem

export type RefreshTokenResult = { kind: "ok"; data: AuthRefreshTokenResponse } | GeneralApiProblem

export type ProfileResult = { kind: "ok"; data: User } | GeneralApiProblem

export type UpdateProfileResult = { kind: "ok"; data: User } | GeneralApiProblem

/**
 * Authentication Service - handles all auth API operations
 */
export class AuthService {
  api: Api

  constructor(api: Api) {
    this.api = api
  }

  /**
   * Sign in user with username and password
   * @param credentials - User credentials (username/email and password)
   * @returns Auth result with tokens and user data or error
   */
  async signIn(credentials: AuthSignInRequest): Promise<AuthResult> {
    try {
      console.log("[signIn] Signing in user:", credentials.username)
      const response = await this.api.apisauce.post<AuthSignInResponse>(
        "/auth/sign_in",
        credentials,
      )

      if (!response.ok) {
        console.log("[signIn] Sign in failed with status:", response.status)
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      const data = normalizeAuthResponse(response.data!)
      console.log(
        "[signIn] Using refreshToken:",
        data.refreshToken ? "from response" : "fallback to accessToken",
      )

      return { kind: "ok", data: response.data! }
    } catch (error) {
      console.error("[signIn] Catch error:", error)
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Register new user account
   * @param userData - User registration data (email, username, password, profile info)
   * @returns Registered user data or error
   */
  async register(userData: AuthRegisterRequest): Promise<RegisterResult> {
    try {
      const response = await this.api.apisauce.post<AuthRegisterResponse>(
        "/auth/register",
        userData,
      )

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: response.data! }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Refresh access token using refresh token from secure storage
   * @returns New access token and optional new refresh token or error
   */
  async refreshToken(): Promise<RefreshTokenResult> {
    try {
      const refreshToken = await getRefreshToken()

      if (!refreshToken) {
        return { kind: "unauthorized" }
      }

      const response = await this.api.apisauce.post<AuthRefreshTokenResponse>(
        "/auth/refresh_token",
        { refresh: refreshToken } as AuthRefreshTokenRequest,
      )

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      // Save new token
      const data = normalizeAuthResponse(response.data!)
      await saveActiveSessionTokens(data.accessToken, data.refreshToken || refreshToken)

      return { kind: "ok", data: response.data! }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Get current user profile
   * @returns Current user's profile data or error
   */
  async getProfile(): Promise<ProfileResult> {
    try {
      console.log("[getProfile] Fetching user profile from /auth/profile...")
      // Use authenticatedGet to ensure token is properly injected
      const response = await this.api.authenticatedGet<User>("/auth/profile")

      console.log("[getProfile] Response received:")
      console.log(`  - Status: ${response.status}`)
      console.log(`  - OK: ${response.ok}`)
      console.log(`  - Problem: ${response.problem}`)

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) {
          console.log("[getProfile] API error problem:", problem)
          return problem
        }
        return { kind: "bad-data" }
      }

      console.log("[getProfile] Successfully fetched profile data")
      return { kind: "ok", data: response.data! }
    } catch (error) {
      console.error("[getProfile] Catch error:", error)
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Update user profile information
   * @param updates - Profile fields to update (name, email, phone, location, etc.)
   * @returns Updated user profile or error
   */
  async updateProfile(updates: UpdateUserProfileRequest): Promise<UpdateProfileResult> {
    try {
      console.log("[updateProfile] Updating user profile...")
      // Use authenticatedPut to ensure token is properly injected
      const response = await this.api.authenticatedPut<User>("/auth/update", updates)

      console.log("[updateProfile] Response received:")
      console.log(`  - Status: ${response.status}`)
      console.log(`  - OK: ${response.ok}`)
      console.log(`  - Problem: ${response.problem}`)

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) {
          console.log("[updateProfile] API error problem:", problem)
          return problem
        }
        return { kind: "bad-data" }
      }

      console.log("[updateProfile] Successfully updated profile")
      return { kind: "ok", data: response.data! }
    } catch (error) {
      console.error("[updateProfile] Catch error:", error)
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Logout - clear tokens from storage
   */
  async logout(): Promise<void> {
    await clearTokens()
  }
}
export const authService = new AuthService(api)
