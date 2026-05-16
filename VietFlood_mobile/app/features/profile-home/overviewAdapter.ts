/**
 * Overview/Home Dashboard Data Adapter
 *
 * Transforms FE-equivalent API responses into mobile view models.
 * Handles the mapping between FE field names and mobile requirements.
 */

export interface OverviewSummaryData {
  // Users overview metrics
  totalUsers?: number
  activeUsers?: number
  newUsers?: number

  // Reports overview metrics
  totalReports?: number
  pendingReports?: number
  completedReports?: number

  // Common fields
  greeting?: string
  lastUpdated?: string
}

export interface OverviewViewModel {
  usersSummary: {
    total: number
    active: number
    new: number
  }
  reportsSummary: {
    total: number
    pending: number
    completed: number
  }
  greeting: string
  timestamp: string
}

/**
 * Adapter to transform FE overview API response to mobile view model
 *
 * Handles missing fields with sensible defaults to ensure robust display
 * even if FE API response is incomplete.
 */
export function adaptOverviewData(feResponse: unknown): OverviewViewModel {
  // Type guard and default extraction
  const data = typeof feResponse === "object" && feResponse ? feResponse : {}
  const {
    totalUsers = 0,
    activeUsers = 0,
    newUsers = 0,
    totalReports = 0,
    pendingReports = 0,
    completedReports = 0,
    greeting = "Welcome back",
    lastUpdated = new Date().toISOString(),
  } = data as OverviewSummaryData

  return {
    usersSummary: {
      total: Math.max(0, Number(totalUsers) || 0),
      active: Math.max(0, Number(activeUsers) || 0),
      new: Math.max(0, Number(newUsers) || 0),
    },
    reportsSummary: {
      total: Math.max(0, Number(totalReports) || 0),
      pending: Math.max(0, Number(pendingReports) || 0),
      completed: Math.max(0, Number(completedReports) || 0),
    },
    greeting: String(greeting).trim() || "Welcome back",
    timestamp: String(lastUpdated).trim() || new Date().toISOString(),
  }
}

/**
 * Mock overview data for testing/development
 */
export function getMockOverviewData(): OverviewViewModel {
  return adaptOverviewData({
    totalUsers: 256,
    activeUsers: 189,
    newUsers: 12,
    totalReports: 1432,
    pendingReports: 43,
    completedReports: 1389,
    greeting: "Welcome back, Administrator",
    lastUpdated: new Date().toISOString(),
  })
}
