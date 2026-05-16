import { defaultApiService, defaultPersistenceService } from "@/features/shared"

export interface HomeSummary {
  greeting: string
  openTasks: number
  unreadAlerts: number
}

const HOME_SUMMARY_CACHE_KEY = "vf.profile-home.summary"

export interface ProfileHomeFeatureApi {
  loadHomeSummary(): Promise<HomeSummary>
}

export function createProfileHomeFeature(): ProfileHomeFeatureApi {
  return {
    async loadHomeSummary() {
      const response = await defaultApiService.request<HomeSummary>("get", "/profile/home-summary")
      if (response.ok && response.data) {
        defaultPersistenceService.setJson(HOME_SUMMARY_CACHE_KEY, response.data)
        return response.data
      }

      return (
        defaultPersistenceService.getJson<HomeSummary>(HOME_SUMMARY_CACHE_KEY) ?? {
          greeting: "Welcome back",
          openTasks: 0,
          unreadAlerts: 0,
        }
      )
    },
  }
}
