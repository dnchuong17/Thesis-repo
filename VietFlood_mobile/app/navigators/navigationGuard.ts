/**
 * Navigation Guard Utilities
 *
 * Centralizes route access control logic for FE-parity public/authenticated route separation.
 * This replaces scattered hasAccess checks with a consistent, testable gate pattern.
 */

import type { AppRouteName, UserRole } from "@/features/shared"

/**
 * Route access level classification
 */
export enum RouteAccessLevel {
  PUBLIC = "public", // Accessible without authentication
  AUTHENTICATED = "authenticated", // Requires valid session
}

/**
 * Route access configuration - maps route names to required access level and optional roles
 */
export interface RouteAccessConfig {
  accessLevel: RouteAccessLevel
  allowedRoles?: UserRole[] // If specified, only these roles can access. If not, all authenticated users can.
}

/**
 * Route access registry - defines all appRoutes and their access requirements
 *
 * Two main user roles:
 * 1. RELIEF - Relief coordinators managing resources and distributions
 * 2. USER - Regular residents reporting and viewing information
 */
const ROUTE_ACCESS_CONFIG: Record<AppRouteName, RouteAccessConfig> = {
  // Public routes (no authentication required)
  Welcome: {
    accessLevel: RouteAccessLevel.PUBLIC,
  },
  Login: {
    accessLevel: RouteAccessLevel.PUBLIC,
  },
  Register: {
    accessLevel: RouteAccessLevel.PUBLIC,
  },

  // RELIEF ROLE ROUTES - For relief coordinators managing crisis response
  Reports: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "relief", "coordinator", "admin"],
  },
  Relief: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["relief", "coordinator", "admin"],
  },

  // USER ROLE ROUTES - For residents reporting and viewing information
  ProfileHome: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "volunteer", "coordinator", "admin"],
  },
  Settings: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "volunteer", "coordinator", "admin", "relief"],
  },
  Windy: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "volunteer", "coordinator", "admin", "relief"],
  },

  // Admin/coordinator only routes
  Volunteer: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["volunteer", "coordinator", "admin"],
  },
  UsersOverview: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["coordinator", "admin", "relief"],
  },

  // Relief Role Specific Routes
  ReliefMap: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["relief", "coordinator", "admin"],
  },
  ReliefReportsListScreen: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["relief", "coordinator", "admin"],
  },
  ReliefReportDetailScreen: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["relief", "coordinator", "admin"],
  },

  // Profile routes - accessible for all authenticated users
  ProfileView: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "relief", "coordinator", "admin", "volunteer"],
  },
  ProfileEdit: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "relief", "coordinator", "admin", "volunteer"],
  },

  // Settings Routes - accessible for all authenticated users
  ChangePasswordScreen: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "relief", "coordinator", "admin", "volunteer"],
  },
  UserGuideScreen: {
    accessLevel: RouteAccessLevel.AUTHENTICATED,
    allowedRoles: ["user", "resident", "relief", "coordinator", "admin", "volunteer"],
  },
}

/**
 * Check if a user can access a specific route
 *
 * @param routeName - Name of the route to check
 * @param isAuthenticated - Whether user has valid session
 * @param userRole - Current user role (defaults to 'guest' if not authenticated)
 * @returns true if user can access the route
 */
export function canAccessRoute(
  routeName: AppRouteName,
  isAuthenticated: boolean,
  userRole?: UserRole,
): boolean {
  const config = ROUTE_ACCESS_CONFIG[routeName]

  if (!config) {
    // Unknown route defaults to authenticated requirement for safety
    return isAuthenticated
  }

  // Check access level
  if (config.accessLevel === RouteAccessLevel.PUBLIC) {
    return !isAuthenticated
  }

  if (config.accessLevel === RouteAccessLevel.AUTHENTICATED) {
    // Authenticated route requires valid session
    if (!isAuthenticated) {
      return false
    }

    // If specific roles required, check role membership
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      return userRole ? config.allowedRoles.includes(userRole) : false
    }

    // No role restriction, authenticated users can access
    return true
  }

  return false
}

/**
 * Determine which navigator stack to show based on authentication state
 *
 * Returns the initial route name that should be shown:
 * - Public stack (Login) if not authenticated
 * - Role-specific stack if authenticated:
 *   * Relief role → Relief screen
 *   * User role → ProfileHome screen
 *   * Other roles → accessible routes
 *
 * @param isAuthenticated - Whether user has valid session
 * @param userRole - Current user role
 * @returns Initial route name to display
 */
export function getInitialRouteName(isAuthenticated: boolean, userRole?: UserRole): AppRouteName {
  if (!isAuthenticated) {
    return "Welcome" // Start at welcome for unauthenticated users
  }

  // Route based on user role
  if (userRole === "relief" || userRole === "coordinator" || userRole === "admin") {
    // Relief coordinators go to Relief dashboard
    if (canAccessRoute("Relief", isAuthenticated, userRole)) {
      return "Relief"
    }
    if (canAccessRoute("Reports", isAuthenticated, userRole)) {
      return "Reports"
    }
  }

  if (userRole === "user" || userRole === "resident") {
    // Regular users go to ProfileHome dashboard
    if (canAccessRoute("ProfileHome", isAuthenticated, userRole)) {
      return "ProfileHome"
    }
  }

  // For other roles (volunteer, etc), find first accessible route
  const accessibleRoutes: AppRouteName[] = [
    "ProfileHome",
    "UsersOverview",
    "Reports",
    "Relief",
    "Windy",
    "Volunteer",
    "Settings",
  ]

  for (const route of accessibleRoutes) {
    if (canAccessRoute(route, isAuthenticated, userRole)) {
      return route
    }
  }

  // Fallback to ProfileHome if something goes wrong
  return "ProfileHome"
}

/**
 * Resolve the route that should remain active after auth state changes.
 *
 * If the current route is still accessible for the latest auth state, keep it.
 * Otherwise fall back to the role-appropriate initial route.
 */
export function resolveAccessibleRoute(
  currentRoute: AppRouteName | undefined,
  isAuthenticated: boolean,
  userRole?: UserRole,
): AppRouteName {
  if (currentRoute && canAccessRoute(currentRoute, isAuthenticated, userRole)) {
    return currentRoute
  }

  return getInitialRouteName(isAuthenticated, userRole)
}

/**
 * Get all publicly accessible route names (no auth required)
 */
export function getPublicRoutes(): AppRouteName[] {
  return Object.entries(ROUTE_ACCESS_CONFIG)
    .filter(([, config]) => config.accessLevel === RouteAccessLevel.PUBLIC)
    .map(([routeName]) => routeName as AppRouteName)
}

/**
 * Get all authenticated-only route names (auth required)
 */
export function getAuthenticatedRoutes(): AppRouteName[] {
  return Object.entries(ROUTE_ACCESS_CONFIG)
    .filter(([, config]) => config.accessLevel === RouteAccessLevel.AUTHENTICATED)
    .map(([routeName]) => routeName as AppRouteName)
}
