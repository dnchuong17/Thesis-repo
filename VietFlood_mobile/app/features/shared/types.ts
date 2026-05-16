export type UserRole =
  | "guest"
  | "relief"
  | "user"
  | "resident"
  | "volunteer"
  | "coordinator"
  | "admin"

export interface AuthSession {
  token: string
  email: string
  role: UserRole
  signedInAt: string
}

export interface FeatureResult<TData> {
  ok: boolean
  data?: TData
  error?: string
}

export type AppRouteName =
  | "Welcome"
  | "Login"
  | "Register"
  | "Reports"
  | "Relief"
  | "ReliefMap"
  | "ReliefReportsListScreen"
  | "ReliefReportDetailScreen"
  | "Volunteer"
  | "ProfileHome"
  | "ProfileView"
  | "ProfileEdit"
  | "UsersOverview"
  | "Settings"
  | "ChangePasswordScreen"
  | "UserGuideScreen"
  | "Windy"

export type OfflineStatus = "online" | "cached" | "queued" | "offline"
