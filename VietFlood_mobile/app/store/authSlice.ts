/**
 * Redux Toolkit auth slice for authentication state management
 */
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

import { authService } from "@/services/api/authService"
import { clearTokens, saveTokens } from "@/services/api/tokenStorage"
import type { AuthSignInRequest, AuthRefreshTokenResponse } from "@/services/api/types"
import { normalizeAuthResponse } from "@/services/api/types"

import type { AuthState, UserRole } from "./types"

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastRefreshAttempt: 0,
}

/**
 * Async thunk for signing in user
 */
export const signInUser = createAsyncThunk(
  "auth/signIn",
  async (credentials: AuthSignInRequest, { rejectWithValue }) => {
    try {
      const result = await authService.signIn(credentials)

      if (result.kind !== "ok") {
        return rejectWithValue(
          result.kind === "unauthorized"
            ? "Invalid username or password"
            : result.kind === "cannot-connect"
              ? "Cannot connect to server"
              : "Login failed",
        )
      }

      const data = normalizeAuthResponse(result.data)
      await saveTokens(data.accessToken, data.refreshToken || data.accessToken, data.user?.id)

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || data.accessToken,
        user: {
          id: data.user?.id || 0,
          username: data.user?.username || credentials.username,
          email: data.user?.email,
          first_name: data.user?.first_name,
          last_name: data.user?.last_name,
          role: (data.user?.role || "user") as UserRole,
        },
      }
    } catch {
      return rejectWithValue("An unexpected error occurred")
    }
  },
)

/**
 * Async thunk for refreshing access token
 */
export const refreshAccessToken = createAsyncThunk(
  "auth/refresh",
  async (_, { getState, rejectWithValue }) => {
    try {
      // Prevent rapid refresh attempts (max once per 2 seconds)
      const state = getState() as any
      const now = Date.now()
      if (state.auth.lastRefreshAttempt && now - state.auth.lastRefreshAttempt < 2000) {
        return rejectWithValue("Refresh already in progress")
      }

      const result = await authService.refreshToken()

      if (result.kind !== "ok") {
        await clearTokens()
        return rejectWithValue("Token refresh failed - please login again")
      }

      const data = normalizeAuthResponse(result.data)
      await saveTokens(data.accessToken, data.refreshToken || data.accessToken)

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || data.accessToken,
      }
    } catch {
      await clearTokens()
      return rejectWithValue("Token refresh error")
    }
  },
)

/**
 * Async thunk for registering a new user
 */
export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData: any, { rejectWithValue }) => {
    try {
      const result = await authService.register(userData)

      if (result.kind !== "ok") {
        return rejectWithValue("Registration failed")
      }

      return { success: true }
    } catch {
      return rejectWithValue("An unexpected error occurred during registration")
    }
  },
)

/**
 * Auth slice reducer and actions
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Synchronous logout action
    logout: (_state) => {
      void clearTokens()
      return {
        ...initialState,
      }
    },

    // Set auth state from storage (for hydration)
    setAuthState: (
      state,
      action: PayloadAction<{
        accessToken: string | null
        refreshToken: string | null
        user: AuthState["user"]
      }>,
    ) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      state.isAuthenticated = !!action.payload.accessToken
      state.isLoading = false
      state.error = null
    },

    // Clear auth error
    clearError: (state) => {
      state.error = null
    },

    // Set auth pending (loading)
    setAuthPending: (state) => {
      state.isLoading = true
      state.error = null
    },

    // Set auth error
    setAuthError: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // Update auth token
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload
    },
  },

  extraReducers: (builder) => {
    // Sign In
    builder
      .addCase(signInUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.user = action.payload.user
        state.error = null
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = (action.payload as string) || "Login failed"
      })

    // Refresh Token
    builder
      .addCase(refreshAccessToken.pending, (state) => {
        state.isLoading = true
        state.lastRefreshAttempt = Date.now()
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.accessToken = null
        state.refreshToken = null
        state.user = null
        state.error = (action.payload as string) || "Token refresh failed"
      })

    // Register User
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = (action.payload as string) || "Registration failed"
      })
  },
})

export const { logout, setAuthState, clearError, setAccessToken, setAuthPending, setAuthError } =
  authSlice.actions

export default authSlice.reducer

// Selectors
export const selectToken = (state: { auth: AuthState }) => state.auth.accessToken ?? undefined
export const selectRefreshToken = (state: { auth: AuthState }) =>
  state.auth.refreshToken ?? undefined
export const selectUsername = (state: { auth: AuthState }) => state.auth.user?.username ?? undefined
export const selectUserId = (state: { auth: AuthState }) => state.auth.user?.id ?? undefined
export const selectRole = (state: { auth: AuthState }) =>
  (state.auth.user?.role ?? undefined) as UserRole | undefined
export const selectAuthStatus = (state: { auth: AuthState }) =>
  state.auth.isLoading
    ? "pending"
    : state.auth.error
      ? "error"
      : state.auth.isAuthenticated
        ? "authenticated"
        : "idle"
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error ?? undefined
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
