import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useDispatch, useSelector } from "react-redux"

import { buildSessionForRoute, createIgniteAuthAdapter } from "@/features/adapters"
import { createAuthFeature } from "@/features/auth"
import {
  defaultErrorReporter,
  defaultPersistenceService,
  type AppRouteName,
  type UserRole,
} from "@/features/shared"
import { defaultRbacService } from "@/features/shared/rbac"
import { translate } from "@/i18n/translate"
import { authService } from "@/services/api/authService"
import {
  clearTokens,
  getAuthMetadata,
  getTokens,
  saveAuthMetadata,
  saveSessionAuthMetadata,
  saveSessionTokens,
  saveTokens,
} from "@/services/api/tokenStorage"
import { AuthRegisterRequest, normalizeAuthResponse } from "@/services/api/types"
import type { RootState } from "@/store"
import {
  setAccessToken,
  setAuthState,
  setAuthError,
  setAuthPending,
  logout as reduxLogout,
  clearError,
  selectToken,
  selectUsername,
  selectUserId,
  selectRole,
  selectAuthStatus,
  selectAuthError,
} from "@/store/authSlice"
import { loadString, remove, saveString } from "@/utils/storage"

type AuthStatus = "idle" | "pending" | "authenticated" | "error"

function normalizeRole(value?: string): UserRole {
  if (!value) return "guest"

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^role[_\s-]*/, "")

  switch (normalized) {
    case "relief":
    case "relief_staff":
    case "relief-staff":
    case "rescue":
      return "relief"
    case "coordinator":
    case "relief_coordinator":
    case "relief-coordinator":
      return "coordinator"
    case "admin":
    case "administrator":
      return "admin"
    case "user":
      return "user"
    case "citizen":
    case "resident":
      return "resident"
    case "volunteer":
      return "volunteer"
    case "guest":
      return "guest"
    default:
      return "guest"
  }
}

function shouldClearRestoredSession(kind: string) {
  return ["unauthorized", "forbidden", "not-found", "rejected", "bad-data"].includes(kind)
}

export type AuthContextType = {
  isAuthenticated: boolean
  isHydrating: boolean
  authToken?: string
  authUsername?: string
  authUserId?: number
  authRole: UserRole
  authStatus: AuthStatus
  authMessage?: string
  setAuthToken: (token?: string) => void
  setAuthUsername: (username: string) => void
  loginWithPassword: (
    username: string,
    password: string,
    shouldSaveSession?: boolean,
  ) => Promise<UserRole | null>
  registerUser: (userData: AuthRegisterRequest) => Promise<boolean>
  rehydrateSession: () => Promise<void>
  hasAccess: (routeName: AppRouteName) => boolean
  logout: () => void
  validationError: string
}

export const AuthContext = createContext<AuthContextType | null>(null)

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({ children }) => {
  const dispatch = useDispatch()
  const hasRehydrated = useRef(false)
  const [isHydrating, setIsHydrating] = useState(true)

  // Select auth state from Redux
  const authToken = useSelector((state: RootState) => selectToken(state))
  const authUsername = useSelector((state: RootState) => selectUsername(state))
  const authUserId = useSelector((state: RootState) => selectUserId(state))
  const authRole = useSelector((state: RootState) => selectRole(state))
  const authStatus = useSelector((state: RootState) => selectAuthStatus(state))
  const authErrorMessage = useSelector((state: RootState) => selectAuthError(state))

  const setAuthRole = useCallback((role?: UserRole) => {
    if (role && role !== "guest") {
      saveString("AuthProvider.authRole", role)
    } else {
      remove("AuthProvider.authRole")
    }
  }, [])

  const setStoredAuthToken = useCallback((token?: string) => {
    if (!token) {
      remove("AuthProvider.authToken")
    } else {
      saveString("AuthProvider.authToken", token)
    }
  }, [])

  const setStoredAuthUsername = useCallback((username?: string) => {
    if (!username) {
      remove("AuthProvider.authUsername")
    } else {
      saveString("AuthProvider.authUsername", username)
    }
  }, [])

  const setStoredAuthUserId = useCallback((userId?: number) => {
    if (!userId) {
      remove("AuthProvider.authUserId")
    } else {
      saveString("AuthProvider.authUserId", String(userId))
    }
  }, [])

  const authFeature = useMemo(
    () =>
      createAuthFeature({
        persistence: defaultPersistenceService,
        rbac: defaultRbacService,
        errors: defaultErrorReporter,
      }),
    [],
  )
  const authAdapter = useMemo(
    () => createIgniteAuthAdapter(authFeature, defaultRbacService),
    [authFeature],
  )

  const setAuthToken = useCallback(
    (token?: string) => {
      setStoredAuthToken(token)
      if (token) {
        dispatch(setAccessToken(token))
      }
    },
    [dispatch, setStoredAuthToken],
  )

  const setAuthUsername = useCallback(
    (username: string) => {
      setStoredAuthUsername(username.trim() || undefined)
    },
    [setStoredAuthUsername],
  )

  /**
   * Persist auth metadata to SecureStore (used during login/rehydration)
   * This ensures metadata is durably stored before navigation changes
   */
  const persistAuthMetadata = useCallback(
    async (meta: { username?: string; userId?: number; role?: UserRole }) => {
      await saveAuthMetadata(meta)
    },
    [],
  )

  const clearLegacyAuthStorage = useCallback(() => {
    setStoredAuthToken(undefined)
    setStoredAuthUsername(undefined)
    setStoredAuthUserId(undefined)
    setAuthRole(undefined)
  }, [setAuthRole, setStoredAuthToken, setStoredAuthUserId, setStoredAuthUsername])

  const clearReduxAuthState = useCallback(() => {
    dispatch(
      setAuthState({
        accessToken: null,
        refreshToken: null,
        user: null,
      }),
    )
  }, [dispatch])

  const rehydrateSession = useCallback(async () => {
    try {
      // Load tokens from secure storage
      const [storedTokens, storedMetadata] = await Promise.all([getTokens(), getAuthMetadata()])
      const storedUsername = storedMetadata.username || loadString("AuthProvider.authUsername")
      const storedRole = normalizeRole(
        storedMetadata.role || loadString("AuthProvider.authRole") || undefined,
      )

      if (!storedTokens.accessToken) {
        // No tokens saved, session is unauthenticated
        await clearTokens()
        clearLegacyAuthStorage()
        clearReduxAuthState()
        return
      }

      // Tokens exist, restore the session
      console.log("[AuthContext] Restoring session from secure storage")
      const parsedUserId = storedMetadata.userId
        ? Number.parseInt(storedMetadata.userId, 10)
        : undefined
      const fallbackUserId = Number.isNaN(parsedUserId) ? undefined : parsedUserId
      const fallbackRole = storedRole === "guest" ? "user" : storedRole
      const fallbackUsername = storedUsername || "user"

      dispatch(
        setAuthState({
          accessToken: storedTokens.accessToken,
          refreshToken: storedTokens.refreshToken,
          user: {
            id: fallbackUserId ?? 0,
            username: fallbackUsername,
            role: fallbackRole,
          },
        }),
      )
      setStoredAuthToken(storedTokens.accessToken)
      setStoredAuthUsername(fallbackUsername)
      setStoredAuthUserId(fallbackUserId)
      setAuthRole(fallbackRole)

      // Attempt to enrich restored session with the latest profile.
      // Keep the restored session if profile fetch fails due connectivity issues.
      const profileResult = await authService.getProfile()
      if (profileResult.kind === "ok") {
        const profile = profileResult.data
        const normalizedProfileRole = normalizeRole(profile.role)

        await saveAuthMetadata({
          username: profile.username,
          userId: profile.id,
          role: normalizedProfileRole,
        })
        setStoredAuthUsername(profile.username)
        setStoredAuthUserId(profile.id)
        setAuthRole(normalizedProfileRole)

        dispatch(
          setAuthState({
            accessToken: storedTokens.accessToken,
            refreshToken: storedTokens.refreshToken,
            user: {
              id: profile.id,
              username: profile.username,
              email: profile.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
              role: normalizedProfileRole,
            },
          }),
        )
      } else if (shouldClearRestoredSession(profileResult.kind)) {
        await clearTokens()
        clearLegacyAuthStorage()
        clearReduxAuthState()
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to restore session:", error)
      }
      await clearTokens().catch(() => undefined)
      clearLegacyAuthStorage()
      clearReduxAuthState()
    } finally {
      // Mark hydration as complete regardless of success/failure
      setIsHydrating(false)
    }
  }, [
    clearLegacyAuthStorage,
    clearReduxAuthState,
    setAuthRole,
    setStoredAuthToken,
    setStoredAuthUserId,
    setStoredAuthUsername,
  ])

  useEffect(() => {
    // Only rehydrate session once on mount
    if (!hasRehydrated.current) {
      hasRehydrated.current = true
      void rehydrateSession()
    }
  }, []) // Empty dependency array is correct - hasRehydrated ref prevents re-runs

  const loginWithPassword = useCallback(
    async (username: string, password: string, shouldSaveSession = true) => {
      dispatch(setAuthPending())

      // Use AuthService for real API call
      const result = await authService.signIn({ username, password })

      if (result.kind !== "ok") {
        dispatch(
          setAuthError(
            result.kind === "unauthorized"
              ? translate("authMessages:invalidCredentials")
              : result.kind === "cannot-connect"
                ? translate("authMessages:cannotConnect")
                : result.kind === "timeout"
                  ? translate("authMessages:requestTimedOut")
                  : translate("authMessages:loginFailed"),
          ),
        )
        return null
      }

      const data = normalizeAuthResponse(result.data)
      const refreshToken = data.refreshToken || data.accessToken

      try {
        if (shouldSaveSession) {
          await saveTokens(data.accessToken, refreshToken, result.data.user?.id)
        } else {
          await saveSessionTokens(data.accessToken, refreshToken, result.data.user?.id)
          clearLegacyAuthStorage()
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to initialize login session:", error)
        }
        await clearTokens().catch(() => undefined)
        clearLegacyAuthStorage()
        dispatch(setAuthError(translate("authMessages:couldNotSaveLoginSession")))
        return null
      }

      const profileResult = await authService.getProfile()
      const profile = profileResult.kind === "ok" ? profileResult.data : undefined

      const resolvedRole = normalizeRole(profile?.role || result.data.user?.role || "user")
      const userRole = resolvedRole === "guest" ? "resident" : resolvedRole
      const resolvedUser = {
        id: profile?.id ?? result.data.user?.id ?? 0,
        username: profile?.username ?? result.data.user?.username ?? username,
        email: profile?.email ?? result.data.user?.email,
        first_name: profile?.first_name ?? result.data.user?.first_name,
        last_name: profile?.last_name ?? result.data.user?.last_name,
        role: userRole,
      }

      try {
        if (shouldSaveSession) {
          await Promise.all([
            saveTokens(data.accessToken, refreshToken, resolvedUser.id),
            persistAuthMetadata({
              username: resolvedUser.username,
              userId: resolvedUser.id,
              role: userRole,
            }),
          ])
          setStoredAuthToken(data.accessToken)
          setStoredAuthUsername(resolvedUser.username)
          setStoredAuthUserId(resolvedUser.id)
          setAuthRole(userRole)
        } else {
          await Promise.all([
            saveSessionTokens(data.accessToken, refreshToken, resolvedUser.id),
            saveSessionAuthMetadata({
              username: resolvedUser.username,
              userId: resolvedUser.id,
              role: userRole,
            }),
          ])
          clearLegacyAuthStorage()
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to save login session:", error)
        }
        await clearTokens().catch(() => undefined)
        clearLegacyAuthStorage()
        dispatch(setAuthError(translate("authMessages:couldNotSaveLoginSession")))
        return null
      }

      dispatch(
        setAuthState({
          accessToken: data.accessToken,
          refreshToken: refreshToken,
          user: resolvedUser,
        }),
      )

      return userRole
    },
    [
      dispatch,
      setStoredAuthUsername,
      setStoredAuthToken,
      setAuthRole,
      setStoredAuthUserId,
      persistAuthMetadata,
      clearLegacyAuthStorage,
    ],
  )

  const registerUser = useCallback(
    async (userData: AuthRegisterRequest) => {
      dispatch(setAuthPending())

      const result = await authService.register(userData)

      if (result.kind !== "ok") {
        dispatch(
          setAuthError(
            result.kind === "rejected"
              ? translate("authMessages:registrationCheckInfo")
              : result.kind === "cannot-connect"
                ? translate("authMessages:cannotConnect")
                : result.kind === "timeout"
                  ? translate("authMessages:requestTimedOut")
                  : translate("authMessages:registrationFailed"),
          ),
        )
        return false
      }

      dispatch(clearError())
      return true
    },
    [dispatch],
  )

  const logout = useCallback(() => {
    void authService.logout().finally(() => {
      clearLegacyAuthStorage()
      dispatch(reduxLogout())
    })
  }, [clearLegacyAuthStorage, dispatch])

  const hasAccess = useCallback(
    (routeName: AppRouteName) => {
      const session = buildSessionForRoute(authToken, authUsername, normalizeRole(authRole))
      return authAdapter.hasAccess(routeName, session)
    },
    [authAdapter, authUsername, authRole, authToken],
  )

  const validationError = useMemo(() => {
    if (!authUsername || authUsername.length === 0) return translate("authMessages:usernameBlank")
    if (authUsername.length < 3) return translate("authMessages:usernameMinLength")
    if (!/^[a-zA-Z0-9_-]+$/.test(authUsername))
      return translate("authMessages:usernameCharset")
    return ""
  }, [authUsername])

  const value = {
    isAuthenticated: !!authToken,
    isHydrating,
    authToken,
    authUsername,
    authUserId,
    authRole: normalizeRole(authRole),
    authStatus: authStatus as AuthStatus,
    authMessage: authErrorMessage,
    setAuthToken,
    setAuthUsername,
    loginWithPassword,
    registerUser,
    rehydrateSession,
    hasAccess,
    logout,
    validationError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
