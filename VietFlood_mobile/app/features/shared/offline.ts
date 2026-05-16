import type { OfflineStatus } from "./types"

export function deriveOfflineStatus(input: {
  isNetworkError: boolean
  hasCachedData: boolean
  queued: boolean
}): OfflineStatus {
  if (!input.isNetworkError) {
    return "online"
  }

  if (input.hasCachedData) {
    return "cached"
  }

  if (input.queued) {
    return "queued"
  }

  return "offline"
}
