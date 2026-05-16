import type { ErrorReporter, PersistenceService, RbacService } from "@/features/shared"
import type { AuthSession, FeatureResult } from "@/features/shared"

import * as authApi from "./authApiService"
import type { AuthFeature, SignInPayload } from "./types"

const AUTH_STORAGE_KEY = "vf.auth.session"

export interface AuthFeatureDependencies {
  persistence: PersistenceService
  rbac: RbacService
  errors: ErrorReporter
}

export function createAuthFeature(deps: AuthFeatureDependencies): AuthFeature {
  return {
    async restoreSession(): Promise<AuthSession | null> {
      try {
        // Load stored session from local storage
        const storedSession = await deps.persistence.getJson<AuthSession>(AUTH_STORAGE_KEY)

        if (!storedSession) {
          return null
        }

        // Validate that the stored token is still valid with the FE API
        const isValid = await authApi.validateSessionToken(storedSession.token)

        if (!isValid) {
          // Token is invalid/expired, clear it from storage
          deps.persistence.remove(AUTH_STORAGE_KEY)
          return null
        }

        // Session is valid, return it
        return storedSession
      } catch (error) {
        // If validation fails, clear the invalid session and return null
        deps.persistence.remove(AUTH_STORAGE_KEY)
        deps.errors.capture(error, {
          feature: "auth",
          action: "restoreSession",
        })
        return null
      }
    },

    async signIn(input: SignInPayload): Promise<FeatureResult<AuthSession>> {
      try {
        // Validate input
        if (!input.email || input.email.trim().length === 0) {
          return {
            ok: false,
            error: "Please enter your email address.",
          }
        }

        if (!input.password || input.password.length < 4) {
          return {
            ok: false,
            error: "Password is too short.",
          }
        }

        // Call FE API service (handles username/token/role mapping)
        const session = await authApi.signInViaFEApi(input.email, input.password)

        // Store session locally
        deps.persistence.setJson(AUTH_STORAGE_KEY, session)

        return {
          ok: true,
          data: session,
        }
      } catch (error) {
        // Extract user-friendly error message
        const errorMessage =
          error instanceof Error ? error.message : "Authentication temporarily unavailable"

        deps.errors.capture(error, {
          feature: "auth",
          action: "signIn",
        })

        return {
          ok: false,
          error: errorMessage,
        }
      }
    },

    async signOut(): Promise<void> {
      deps.persistence.remove(AUTH_STORAGE_KEY)
    },
  }
}
