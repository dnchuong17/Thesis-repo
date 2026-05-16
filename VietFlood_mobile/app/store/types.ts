/**
 * Redux store type definitions for auth and app state
 */

export type UserRole =
  | "admin"
  | "relief"
  | "coordinator"
  | "volunteer"
  | "user"
  | "resident"
  | "guest"

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: {
    id: number
    username: string
    email?: string
    first_name?: string
    last_name?: string
    role: UserRole
  } | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  lastRefreshAttempt: number
}

export interface AppState {
  auth: AuthState
}
