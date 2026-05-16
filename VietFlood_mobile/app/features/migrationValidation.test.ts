import { buildSessionForRoute } from "@/features/adapters/igniteAuthAdapter"
import { isCapabilityEnabled, rolloutConfig } from "@/features/rollout"
import { defaultRbacService } from "@/features/shared/rbac"

describe("migration validation", () => {
  it("enforces RBAC route policy for migrated flows", () => {
    const guestSession = buildSessionForRoute(undefined, undefined, "guest")
    const coordinatorSession = buildSessionForRoute(
      "token",
      "coordinator@example.com",
      "coordinator",
    )

    expect(defaultRbacService.canAccessRoute("Relief", guestSession)).toBe(false)
    expect(defaultRbacService.canAccessRoute("Reports", coordinatorSession)).toBe(true)
  })

  it("supports rollback through rollout toggles", () => {
    const original = rolloutConfig.reportsVerticalSlice

    rolloutConfig.reportsVerticalSlice = false
    expect(isCapabilityEnabled("reportsVerticalSlice")).toBe(false)

    rolloutConfig.reportsVerticalSlice = original
  })
})
