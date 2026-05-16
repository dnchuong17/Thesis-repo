import { useCallback, useState } from "react"

import { translate } from "@/i18n/translate"
import { reportService } from "@/services/api/reportService"
import type { Report, UserWithReportCount } from "@/services/api/types"

/**
 * Hook for relief staff to manage and view reports
 */
export const useReliefReports = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usersWithReports, setUsersWithReports] = useState<UserWithReportCount[]>([])
  const [userReports, setUserReports] = useState<Report[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  /**
   * Fetch all users who have submitted reports
   */
  const fetchUsersWithReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await reportService.getUsersWithReports()
      if (result.kind === "ok") {
        setUsersWithReports(result.data.users)
      } else {
        setError(
          result.kind === "unknown"
            ? translate("apiMessages:genericError")
            : translate("usersOverviewScreen:loadError"),
        )
      }
    } catch (err) {
      setError(translate("usersOverviewScreen:loadError"))
      console.error("Error fetching users with reports:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Fetch reports for a specific user
   */
  const fetchUserReports = useCallback(async (userId: number) => {
    setLoading(true)
    setError(null)
    setSelectedUserId(userId)
    try {
      const result = await reportService.getUserReportsForRelief(userId)
      if (result.kind === "ok") {
        setUserReports(result.data.reports)
      } else {
        setError(
          result.kind === "unknown"
            ? translate("apiMessages:genericError")
            : translate("reportsScreen:errors.loadReportsFailed"),
        )
      }
    } catch (err) {
      setError(translate("reportsScreen:errors.loadReportsFailed"))
      console.error("Error fetching user reports:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Clear selected user and reports
   */
  const clearSelection = useCallback(() => {
    setSelectedUserId(null)
    setUserReports([])
  }, [])

  return {
    loading,
    error,
    usersWithReports,
    userReports,
    selectedUserId,
    fetchUsersWithReports,
    fetchUserReports,
    clearSelection,
  }
}
