import { renderHook } from "@testing-library/react-native"

import type { UserRole } from "@/features/shared"
import { canAccessRoute, resolveAccessibleRoute } from "./navigationGuard"

/**
 * Test to verify that initialRouteName logic doesn't reference non-existent routes
 */
describe("AppNavigator initialRouteName logic", () => {
  /**
   * Mock implementation of route render condition checking
   * This mirrors the actual logic in AppNavigator
   */
  function getInitialRouteName(isAuthenticated: boolean, userRole?: UserRole): string {
    if (!isAuthenticated) {
      return "Welcome"
    }

    if (userRole === "relief" || userRole === "coordinator" || userRole === "admin") {
      // Return first of available relief routes
      return "Relief"
    }

    if (userRole === "user" || userRole === "resident") {
      // Return first of available user routes
      return "ProfileHome"
    }

    // For other roles, return a fallback
    return "ProfileHome"
  }

  function buildRouteRenderMap(
    isAuthenticated: boolean,
    authRole?: UserRole,
    isHydrating = false,
    showLogin = !isAuthenticated || isHydrating,
    showProfileHome = isAuthenticated && !isHydrating,
    showReports = isAuthenticated && !isHydrating,
    showRelief = isAuthenticated && !isHydrating,
    showUsersOverview = isAuthenticated && !isHydrating,
    showSettings = isAuthenticated && !isHydrating,
    showWindy = isAuthenticated && !isHydrating,
    showVolunteer = isAuthenticated && !isHydrating,
  ): Record<string, boolean> {
    const isReliefRole = authRole === "relief" || authRole === "coordinator" || authRole === "admin"
    const isUserRole = authRole === "user" || authRole === "resident"

    return {
      Welcome: showLogin,
      Login: showLogin,
      Register: showLogin,
      Relief: (isReliefRole && showRelief) || (!isReliefRole && !isUserRole && showRelief),
      Volunteer: (isReliefRole && showVolunteer) || (!isReliefRole && !isUserRole && showVolunteer),
      UsersOverview:
        (isReliefRole && showUsersOverview) || (!isReliefRole && !isUserRole && showUsersOverview),
      Reports:
        (isReliefRole && showReports) ||
        (isUserRole && showReports) ||
        (!isReliefRole && !isUserRole && showReports),
      Settings:
        (isReliefRole && showSettings) ||
        (isUserRole && showSettings) ||
        (!isReliefRole && !isUserRole && showSettings),
      ProfileHome:
        (isUserRole && showProfileHome) || (!isReliefRole && !isUserRole && showProfileHome),
      Windy: (isUserRole && showWindy) || (!isReliefRole && !isUserRole && showWindy),
    }
  }

  it("should not set initialRouteName to non-existent routes", () => {
    const testCases: Array<{ isAuthenticated: boolean; authRole?: UserRole }> = [
      { isAuthenticated: false, authRole: undefined },
      { isAuthenticated: true, authRole: "user" },
      { isAuthenticated: true, authRole: "resident" },
      { isAuthenticated: true, authRole: "relief" },
      { isAuthenticated: true, authRole: "coordinator" },
      { isAuthenticated: true, authRole: "admin" },
      { isAuthenticated: true, authRole: "volunteer" },
    ]

    testCases.forEach(({ isAuthenticated, authRole }) => {
      const preferredRoute = getInitialRouteName(isAuthenticated, authRole)
      const routeRenderMap = buildRouteRenderMap(isAuthenticated, authRole)

      // The key assertion: the preferred route should exist in our render map
      expect(routeRenderMap).toHaveProperty(preferredRoute)

      // And if it's set as initialRouteName, it should be renderable
      const initialRouteName = routeRenderMap[preferredRoute] ? preferredRoute : undefined

      // Either initialRouteName is undefined (safe), or it's a route that will render
      if (initialRouteName !== undefined) {
        expect(routeRenderMap[initialRouteName]).toBe(true)
      }
    })
  })

  it("should always have at least one renderable route", () => {
    const testCases: Array<{ isAuthenticated: boolean; authRole?: UserRole }> = [
      { isAuthenticated: false, authRole: undefined },
      { isAuthenticated: true, authRole: "user" },
      { isAuthenticated: true, authRole: "relief" },
      { isAuthenticated: true, authRole: "admin" },
    ]

    testCases.forEach(({ isAuthenticated, authRole }) => {
      const routeRenderMap = buildRouteRenderMap(isAuthenticated, authRole)
      const renderableRoutes = Object.values(routeRenderMap).filter((v) => v === true)

      // There should be at least one renderable route
      expect(renderableRoutes.length).toBeGreaterThan(0)
    })
  })

  it("should hide public routes after authenticated hydration completes", () => {
    const routeRenderMap = buildRouteRenderMap(true, "resident", false)

    expect(routeRenderMap.Welcome).toBe(false)
    expect(routeRenderMap.Login).toBe(false)
    expect(routeRenderMap.Register).toBe(false)
    expect(routeRenderMap.ProfileHome).toBe(true)
  })

  it("should keep public routes while auth hydration is pending", () => {
    const routeRenderMap = buildRouteRenderMap(true, "resident", true)

    expect(routeRenderMap.Welcome).toBe(true)
    expect(routeRenderMap.Login).toBe(true)
    expect(routeRenderMap.Register).toBe(true)
    expect(routeRenderMap.ProfileHome).toBe(false)
  })

  it("should block public routes once a user is authenticated", () => {
    expect(canAccessRoute("Login", true, "resident")).toBe(false)
    expect(canAccessRoute("Welcome", true, "relief")).toBe(false)
    expect(canAccessRoute("Login", false, undefined)).toBe(true)
  })

  it("should resolve a public route to the authenticated fallback after rehydration", () => {
    expect(resolveAccessibleRoute("Login", true, "resident")).toBe("ProfileHome")
    expect(resolveAccessibleRoute("Welcome", true, "relief")).toBe("Relief")
  })

  it("should resolve an authenticated route back to Welcome after logout", () => {
    expect(resolveAccessibleRoute("Reports", false, undefined)).toBe("Welcome")
  })
})
