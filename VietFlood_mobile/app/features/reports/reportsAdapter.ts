/**
 * Reports Data Adapter
 *
 * Transforms FE reports API responses into mobile report list view models.
 */

export interface Report {
  id: string
  title: string
  status: "pending" | "in_progress" | "completed" | "rejected"
  priority?: "low" | "medium" | "high"
  createdAt?: string
  description?: string
}

export interface ReportsViewModel {
  reports: Report[]
  summary: {
    total: number
    pending: number
    inProgress: number
    completed: number
  }
  timestamp: string
}

/**
 * Adapter to transform FE reports API response to mobile view model
 */
export function adaptReportsData(feResponse: unknown): ReportsViewModel {
  const data = typeof feResponse === "object" && feResponse ? feResponse : {}
  const reports = Array.isArray((data as any).reports) ? (data as any).reports : []

  // Normalize reports
  const normalizedReports: Report[] = reports
    .filter((r: any) => typeof r === "object" && r !== null)
    .map((r: any) => ({
      id: String(r.id || Math.random()),
      title: String(r.title || "Untitled Report"),
      status: ["pending", "in_progress", "completed", "rejected"].includes(r.status)
        ? r.status
        : "pending",
      priority: ["low", "medium", "high"].includes(r.priority) ? r.priority : "medium",
      createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
      description: r.description ? String(r.description) : undefined,
    }))

  // Calculate summary statistics
  const summary = {
    total: normalizedReports.length,
    pending: normalizedReports.filter((r) => r.status === "pending").length,
    inProgress: normalizedReports.filter((r) => r.status === "in_progress").length,
    completed: normalizedReports.filter((r) => r.status === "completed").length,
  }

  return {
    reports: normalizedReports,
    summary,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Mock reports data for testing/development
 */
export function getMockReportsData(): ReportsViewModel {
  return adaptReportsData({
    reports: [
      {
        id: "report-1",
        title: "Flood Impact Assessment - District A",
        status: "completed",
        priority: "high",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Initial impact assessment completed",
      },
      {
        id: "report-2",
        title: "Relief Distribution Report",
        status: "in_progress",
        priority: "high",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Ongoing relief distribution",
      },
      {
        id: "report-3",
        title: "Damage Survey - Village B",
        status: "pending",
        priority: "medium",
        createdAt: new Date().toISOString(),
        description: "Awaiting field survey",
      },
      {
        id: "report-4",
        title: "Resource Allocation Plan",
        status: "completed",
        priority: "medium",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  })
}
