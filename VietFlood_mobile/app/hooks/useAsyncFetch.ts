/**
 * Async State Hook
 *
 * Standardized loading, error, empty, and success states across all parity screens.
 * Provides a consistent pattern for data fetching with retry capability.
 */

import { useCallback, useEffect, useState } from "react"

export type AsyncState = "idle" | "loading" | "success" | "error" | "empty"

export interface AsyncData<T> {
  state: AsyncState
  data?: T
  error?: string
  timestamp?: string
}

export interface UseAsyncFetchOptions {
  retry: () => Promise<void>
}

/**
 * Hook for managing async data fetch state
 *
 * Automatically handles loading, success, error, and empty states during data fetch.
 * Returns state and data along with retry function.
 *
 * @param fetchFn - Async function that fetches data and returns data or null for empty state
 * @param dependencies - Dependency array for useEffect (similar to useEffect)
 * @returns Object with state, data, error, and retry function
 */
export function useAsyncFetch<T>(
  fetchFn: () => Promise<T | null>,
  dependencies: React.DependencyList = [],
): AsyncData<T> & UseAsyncFetchOptions {
  const [state, setState] = useState<AsyncState>("idle")
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const fetchData = useCallback(async () => {
    try {
      setState("loading")
      setError(undefined)

      const result = await fetchFn()

      if (result === null || result === undefined) {
        setState("empty")
        setData(undefined)
      } else {
        setState("success")
        setData(result)
      }
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu.")
      setData(undefined)
    }
  }, [fetchFn])

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies])

  return {
    state,
    data,
    error,
    timestamp: new Date().toISOString(),
    retry: fetchData,
  }
}

/**
 * Helper to determine if state represents a loading condition
 */
export function isLoading(state: AsyncState): boolean {
  return state === "idle" || state === "loading"
}

/**
 * Helper to determine if state represents a failed condition
 */
export function isFailed(state: AsyncState): boolean {
  return state === "error"
}

/**
 * Helper to determine if state represents an empty condition
 */
export function isEmpty(state: AsyncState): boolean {
  return state === "empty"
}

/**
 * Helper to determine if state represents a successful load
 */
export function isSuccess(state: AsyncState): boolean {
  return state === "success"
}
