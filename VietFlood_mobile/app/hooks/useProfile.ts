/**
 * Custom hook for managing user profile operations
 *
 * Provides get/update operations for user profiles with loading and error states.
 * Follows the same pattern as other async operations in the app.
 */

import { useCallback, useState } from "react"

import { translate } from "@/i18n/translate"
import { GeneralApiProblem } from "@/services/api/apiProblem"
import { authService } from "@/services/api/authService"
import type { User, UpdateUserProfileRequest } from "@/services/api/types"

export interface UseProfileState {
  user?: User
  loading: boolean
  updating: boolean
  error?: string
  updateError?: string
}

export interface UseProfileActions {
  fetchProfile: () => Promise<void>
  updateProfile: (updates: UpdateUserProfileRequest) => Promise<boolean>
  clearError: () => void
  clearUpdateError: () => void
}

export type UseProfileResult = UseProfileState & UseProfileActions

/**
 * Hook for managing user profile data and operations
 *
 * @returns Object containing profile data, loading states, and action functions
 *
 * @example
 * ```tsx
 * const { user, loading, error, fetchProfile, updateProfile } = useProfile()
 *
 * useEffect(() => {
 *   fetchProfile()
 * }, [fetchProfile])
 * ```
 */
export function useProfile(): UseProfileResult {
  const [user, setUser] = useState<User | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [updateError, setUpdateError] = useState<string | undefined>(undefined)

  /**
   * Fetch current user profile
   */
  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(undefined)

    try {
      const result = await authService.getProfile()

      if (result.kind === "ok") {
        setUser(result.data)
      } else {
        setUser(undefined)
        setError(getErrorMessage(result))
      }
    } catch (err) {
      setUser(undefined)
      setError(err instanceof Error ? err.message : translate("apiMessages:loadProfileError"))
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update user profile with new data
   */
  const updateProfile = useCallback(async (updates: UpdateUserProfileRequest): Promise<boolean> => {
    setUpdating(true)
    setUpdateError(undefined)

    try {
      const result = await authService.updateProfile(updates)

      if (result.kind === "ok") {
        setUser(result.data)
        return true
      } else {
        setUpdateError(getErrorMessage(result))
        return false
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : translate("apiMessages:updateProfileError"))
      return false
    } finally {
      setUpdating(false)
    }
  }, [])

  /**
   * Clear general errors
   */
  const clearError = useCallback(() => {
    setError(undefined)
  }, [])

  /**
   * Clear update-specific errors
   */
  const clearUpdateError = useCallback(() => {
    setUpdateError(undefined)
  }, [])

  return {
    user,
    loading,
    updating,
    error,
    updateError,
    fetchProfile,
    updateProfile,
    clearError,
    clearUpdateError,
  }
}

/**
 * Convert API error response to user-friendly message
 */
function getErrorMessage(result: GeneralApiProblem): string {
  switch (result.kind) {
    case "unauthorized":
      return translate("apiMessages:unauthorized")
    case "forbidden":
      return translate("apiMessages:forbidden")
    case "not-found":
      return translate("apiMessages:notFound")
    case "timeout":
      return translate("apiMessages:timeout")
    case "cannot-connect":
      return translate("apiMessages:cannotConnect")
    case "server":
      return translate("apiMessages:serverError")
    case "rejected":
      return translate("apiMessages:requestRejected")
    case "unknown":
      return translate("apiMessages:genericError")
    case "bad-data":
      return translate("apiMessages:badData")
    default:
      return translate("apiMessages:genericError")
  }
}
