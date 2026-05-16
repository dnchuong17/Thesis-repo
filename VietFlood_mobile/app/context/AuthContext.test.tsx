import React from "react"
import { render, waitFor, act } from "@testing-library/react-native"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"

import { authService } from "@/services/api/authService"
import {
  clearTokens,
  getTokens,
  getUsername,
  saveAuthMetadata,
  saveTokens,
} from "@/services/api/tokenStorage"
import authReducer from "@/store/authSlice"

import { AuthProvider, useAuth, type AuthContextType } from "./AuthContext"

const mockSecureStore = new Map<string, string>()

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore.set(key, value)
    return Promise.resolve()
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureStore.delete(key)
    return Promise.resolve()
  }),
}))

jest.mock("@/services/api/authService", () => ({
  authService: {
    getProfile: jest.fn(),
    signIn: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}))

jest.mock("@/features/adapters", () => ({
  buildSessionForRoute: jest.fn((token, username, role) => ({ token, username, role })),
  createIgniteAuthAdapter: jest.fn(() => ({
    hasAccess: jest.fn(() => true),
  })),
}))

jest.mock("@/features/auth", () => ({
  createAuthFeature: jest.fn(() => ({})),
}))

jest.mock("@/features/shared", () => ({
  defaultErrorReporter: {},
  defaultPersistenceService: {},
}))

jest.mock("@/features/shared/rbac", () => ({
  defaultRbacService: {},
}))

function AuthProbe({ onAuth }: { onAuth: (auth: AuthContextType) => void }) {
  const auth = useAuth()

  React.useEffect(() => {
    onAuth(auth)
  }, [auth, onAuth])

  return null
}

function renderAuthProvider(onAuth: (auth: AuthContextType) => void = jest.fn()) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
  })

  const view = render(
    <Provider store={store}>
      <AuthProvider>
        <AuthProbe onAuth={onAuth} />
      </AuthProvider>
    </Provider>,
  )

  return { store, view }
}

describe("AuthProvider session persistence", () => {
  beforeEach(async () => {
    mockSecureStore.clear()
    jest.clearAllMocks()
    await clearTokens()
    mockSecureStore.clear()
    ;(authService.getProfile as jest.Mock).mockResolvedValue({ kind: "unknown", temporary: true })
    ;(authService.logout as jest.Mock).mockImplementation(async () => {
      await clearTokens()
    })
  })

  it("restores a stored session before profile enrichment succeeds", async () => {
    const onAuth = jest.fn()
    await saveTokens("access-token", "refresh-token", 42)
    await saveAuthMetadata({ userId: 42, username: "stored_user", role: "resident" })

    const { store } = renderAuthProvider(onAuth)

    await waitFor(() => {
      expect(store.getState().auth).toEqual(
        expect.objectContaining({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          isAuthenticated: true,
          user: expect.objectContaining({
            id: 42,
            username: "stored_user",
            role: "resident",
          }),
        }),
      )
    })
    await waitFor(() => {
      expect(onAuth).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
          isHydrating: false,
          authUsername: "stored_user",
        }),
      )
    })
  })

  it("clears stale metadata when no stored token exists", async () => {
    const onAuth = jest.fn()
    await saveAuthMetadata({ userId: 42, username: "stale_user", role: "resident" })

    const { store } = renderAuthProvider(onAuth)

    await waitFor(() => {
      expect(onAuth).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isAuthenticated: false,
          isHydrating: false,
        }),
      )
    })
    expect(store.getState().auth.isAuthenticated).toBe(false)
    expect(await getUsername()).toBeNull()
  })

  it("clears stored auth when profile validation rejects the token", async () => {
    const onAuth = jest.fn()
    await saveTokens("expired-token", "refresh-token", 42)
    await saveAuthMetadata({ userId: 42, username: "stored_user", role: "resident" })
    ;(authService.getProfile as jest.Mock).mockResolvedValue({ kind: "unauthorized" })

    const { store } = renderAuthProvider(onAuth)

    await waitFor(() => {
      expect(onAuth).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isAuthenticated: false,
          isHydrating: false,
        }),
      )
    })
    expect(store.getState().auth.user).toBeNull()
    expect(await getTokens()).toEqual({ accessToken: null, refreshToken: null })
    expect(await getUsername()).toBeNull()
  })

  it("logout removes the reloadable session", async () => {
    let latestAuth: AuthContextType | undefined
    const onAuth = jest.fn((auth: AuthContextType) => {
      latestAuth = auth
    })
    await saveTokens("access-token", "refresh-token", 42)
    await saveAuthMetadata({ userId: 42, username: "stored_user", role: "resident" })

    const { store } = renderAuthProvider(onAuth)

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true)
    })

    act(() => {
      latestAuth?.logout()
    })

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(false)
    })
    expect(await getTokens()).toEqual({ accessToken: null, refreshToken: null })
    expect(await getUsername()).toBeNull()
  })

  it("keeps login session in memory when save session is disabled", async () => {
    let latestAuth: AuthContextType | undefined
    const onAuth = jest.fn((auth: AuthContextType) => {
      latestAuth = auth
    })
    ;(authService.signIn as jest.Mock).mockResolvedValue({
      kind: "ok",
      data: {
        accessToken: "session-access-token",
        refreshToken: "session-refresh-token",
        user: {
          id: 42,
          username: "operator_one",
          role: "resident",
        },
      },
    })

    const { store } = renderAuthProvider(onAuth)

    await waitFor(() => {
      expect(latestAuth?.isHydrating).toBe(false)
    })

    let role: Awaited<ReturnType<AuthContextType["loginWithPassword"]>>
    await act(async () => {
      role = await latestAuth!.loginWithPassword("operator_one", "secret1", false)
    })

    expect(role!).toBe("resident")
    expect(store.getState().auth.isAuthenticated).toBe(true)
    expect(await getTokens()).toEqual({
      accessToken: "session-access-token",
      refreshToken: "session-refresh-token",
    })
    expect(mockSecureStore.get("auth_access_token")).toBeUndefined()
    expect(mockSecureStore.get("auth_refresh_token")).toBeUndefined()
  })

  it("persists login session when save session is enabled", async () => {
    let latestAuth: AuthContextType | undefined
    const onAuth = jest.fn((auth: AuthContextType) => {
      latestAuth = auth
    })
    ;(authService.signIn as jest.Mock).mockResolvedValue({
      kind: "ok",
      data: {
        accessToken: "saved-access-token",
        refreshToken: "saved-refresh-token",
        user: {
          id: 42,
          username: "operator_one",
          role: "resident",
        },
      },
    })

    const { store } = renderAuthProvider(onAuth)

    await waitFor(() => {
      expect(latestAuth?.isHydrating).toBe(false)
    })

    await act(async () => {
      await latestAuth!.loginWithPassword("operator_one", "secret1", true)
    })

    expect(store.getState().auth.isAuthenticated).toBe(true)
    expect(mockSecureStore.get("auth_access_token")).toBe("saved-access-token")
    expect(mockSecureStore.get("auth_refresh_token")).toBe("saved-refresh-token")
    expect(await getUsername()).toBe("operator_one")
  })
})
