/**
 * Custom hook for handling API calls with loading, error, and success states
 */
import { useCallback, useState } from "react"

import { translate } from "@/i18n/translate"
import { GeneralApiProblem } from "@/services/api/apiProblem"

export interface ApiCallState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  errorKind: GeneralApiProblem | null
}

export interface UseApiCallReturn<T> extends ApiCallState<T> {
  execute: () => Promise<void>
  reset: () => void
  setError: (error: string | null) => void
}

type ApiFunction<T> = () => Promise<
  { kind: "ok"; data: T } | GeneralApiProblem | { kind: "ok" } | GeneralApiProblem
>

/**
 * Hook for managing API call state and error handling
 *
 * @example
 * const { data, isLoading, error, execute } = useApiCall(
 *   () => userService.getAllUsers(),
 *   "Failed to load users"
 * )
 *
 * useEffect(() => {
 *   execute()
 * }, [execute])
 */
export function useApiCall<T = void>(
  apiFunction: ApiFunction<T>,
  defaultErrorMessage?: string,
): UseApiCallReturn<T> {
  const resolvedDefaultErrorMessage = defaultErrorMessage ?? translate("apiMessages:genericError")
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    isLoading: false,
    error: null,
    errorKind: null,
  })

  const getErrorMessage = useCallback(
    (problem: GeneralApiProblem | null): string => {
      if (!problem) return resolvedDefaultErrorMessage

      switch (problem.kind) {
        case "timeout":
          return translate("apiMessages:timeout")
        case "cannot-connect":
          return translate("apiMessages:cannotConnect")
        case "server":
          return translate("apiMessages:serverError")
        case "unauthorized":
          return translate("apiMessages:unauthorized")
        case "forbidden":
          return translate("apiMessages:forbidden")
        case "not-found":
          return translate("apiMessages:notFound")
        case "rejected":
          return translate("apiMessages:requestRejected")
        case "bad-data":
          return translate("apiMessages:badData")
        case "unknown":
          return resolvedDefaultErrorMessage
        default:
          return resolvedDefaultErrorMessage
      }
    },
    [resolvedDefaultErrorMessage],
  )

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, errorKind: null }))

    try {
      const result = await apiFunction()

      if (result.kind === "ok") {
        setState({
          data: (result as any).data || null,
          isLoading: false,
          error: null,
          errorKind: null,
        })
      } else {
        const errorMessage = getErrorMessage(result as GeneralApiProblem)
        setState({
          data: null,
          isLoading: false,
          error: errorMessage,
          errorKind: result as GeneralApiProblem,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : resolvedDefaultErrorMessage
      setState({
        data: null,
        isLoading: false,
        error: errorMessage,
        errorKind: { kind: "unknown", temporary: true },
      })
    }
  }, [apiFunction, getErrorMessage, resolvedDefaultErrorMessage])

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      errorKind: null,
    })
  }, [])

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    setError,
  }
}
