import type { RbacService } from "./contracts"
import type { AppRouteName, AuthSession, UserRole } from "./types"

const routeRolePolicy: Record<AppRouteName, UserRole[]> = {
  Welcome: ["guest", "relief", "user", "resident", "volunteer", "coordinator", "admin"],
  Login: ["guest", "relief", "user", "resident", "volunteer", "coordinator", "admin"],
  Register: ["guest", "relief", "user", "resident", "volunteer", "coordinator", "admin"],
  Settings: ["relief", "user", "resident", "volunteer", "coordinator", "admin"],
  Windy: ["relief", "user", "resident", "volunteer", "coordinator", "admin"],
  // Relief coordinator routes - manages resources and distributions
  Reports: ["relief", "coordinator", "admin"],
  Relief: ["relief", "coordinator", "admin"],
  ReliefMap: ["relief", "coordinator", "admin"],
  ReliefReportsListScreen: ["relief", "coordinator", "admin"],
  ReliefReportDetailScreen: ["relief", "coordinator", "admin"],
  // Regular user routes - reports and views information
  ProfileHome: ["user", "resident", "volunteer", "coordinator", "admin"],
  // Profile routes - accessible for all authenticated users
  ProfileView: ["relief", "user", "resident", "volunteer", "coordinator", "admin"],
  ProfileEdit: ["relief", "user", "resident", "volunteer", "coordinator", "admin"],
  // Settings extension routes
  ChangePasswordScreen: ["relief", "user", "resident", "volunteer", "coordinator", "admin"],
  UserGuideScreen: ["relief", "user", "resident", "volunteer", "coordinator", "admin"],
  // Admin/coordinator routes
  Volunteer: ["volunteer", "coordinator", "admin"],
  UsersOverview: ["coordinator", "admin"],
}

export const defaultRbacService: RbacService = {
  hasAnyRole(currentRole, required) {
    const role = currentRole ?? "guest"
    return required.includes(role)
  },
  canAccessRoute(route, session) {
    const role = session?.role ?? "guest"
    const allowedRoles = routeRolePolicy[route]
    return allowedRoles.includes(role)
  },
}

export function canAccessRouteWithRole(route: AppRouteName, role?: UserRole): boolean {
  const session: AuthSession | null = role
    ? {
        token: "test-token",
        email: "test@example.com",
        role,
        signedInAt: new Date().toISOString(),
      }
    : null

  return defaultRbacService.canAccessRoute(route, session)
}
