import type { AppRouteName, AuthSession, OfflineStatus, UserRole } from "./types"

export interface ApiRequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
}

export interface ApiResponseEnvelope<TData> {
  ok: boolean
  status: number
  data?: TData
  error?: string
  offlineStatus: OfflineStatus
}

export interface ApiService {
  request<TData>(
    method: "get" | "post" | "put" | "patch" | "delete",
    path: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponseEnvelope<TData>>
}

export interface PersistenceService {
  getString(key: string): string | null
  setString(key: string, value: string): boolean
  remove(key: string): void
  getJson<TValue>(key: string): TValue | null
  setJson<TValue>(key: string, value: TValue): boolean
}

export interface WeatherSnapshot {
  temperatureC: number
  condition: string
  observedAt: string
}

export interface WeatherService {
  getCurrent(lat: number, lon: number): Promise<WeatherSnapshot>
}

export interface RbacService {
  hasAnyRole(currentRole: UserRole | undefined, required: UserRole[]): boolean
  canAccessRoute(route: AppRouteName, session: AuthSession | null): boolean
}

export interface ErrorContext {
  feature: string
  action: string
  detail?: Record<string, unknown>
}

export interface ErrorReporter {
  capture(error: unknown, context: ErrorContext): void
}
