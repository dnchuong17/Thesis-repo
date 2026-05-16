import { defaultApiService, defaultPersistenceService } from "@/features/shared"

export interface ReportSummary {
  id: string
  title: string
  status: "new" | "in-progress" | "resolved"
}

const REPORT_CACHE_KEY = "vf.reports.cache"

export interface ReportsFeatureApi {
  listReports(): Promise<ReportSummary[]>
}

export function createReportsFeature(): ReportsFeatureApi {
  return {
    async listReports() {
      const response = await defaultApiService.request<ReportSummary[]>("get", "/reports")
      if (response.ok && response.data) {
        defaultPersistenceService.setJson(REPORT_CACHE_KEY, response.data)
        return response.data
      }

      return defaultPersistenceService.getJson<ReportSummary[]>(REPORT_CACHE_KEY) ?? []
    },
  }
}
