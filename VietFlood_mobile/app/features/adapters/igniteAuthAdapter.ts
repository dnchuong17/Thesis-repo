import type { AuthFeature } from "@/features/auth"
import type { AppRouteName, AuthSession, RbacService, UserRole } from "@/features/shared"
import { defaultRbacService } from "@/features/shared/rbac"

export interface IgniteAuthAdapter {
  restore(): Promise<AuthSession | null>
  login(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; session?: AuthSession; error?: string }>
  logout(): Promise<void>
  hasAccess(route: AppRouteName, session: AuthSession | null): boolean
}

export function createIgniteAuthAdapter(
  feature: AuthFeature,
  rbac: RbacService = defaultRbacService,
): IgniteAuthAdapter {
  return {
    async restore() {
      return feature.restoreSession()
    },
    async login(email, password) {
      const result = await feature.signIn({ email, password })
      if (!result.ok || !result.data) {
        return {
          ok: false,
          error: result.error,
        }
      }

      return {
        ok: true,
        session: result.data,
      }
    },
    async logout() {
      await feature.signOut()
    },
    hasAccess(route, session) {
      return rbac.canAccessRoute(route, session)
    },
  }
}

export function buildSessionForRoute(
  token?: string,
  email?: string,
  role?: UserRole,
): AuthSession | null {
  if (!token || !email) return null

  return {
    token,
    email,
    role: role ?? "resident",
    signedInAt: new Date().toISOString(),
  }
}
