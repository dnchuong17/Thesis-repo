import { defaultApiService, defaultPersistenceService } from "@/features/shared"

export interface VolunteerAssignment {
  id: string
  label: string
  status: "queued" | "active" | "done"
}

const VOLUNTEER_CACHE_KEY = "vf.volunteer.cache"

export interface VolunteerFeatureApi {
  listVolunteerAssignments(): Promise<VolunteerAssignment[]>
}

export function createVolunteerFeature(): VolunteerFeatureApi {
  return {
    async listVolunteerAssignments() {
      const response = await defaultApiService.request<VolunteerAssignment[]>(
        "get",
        "/volunteer/assignments",
      )
      if (response.ok && response.data) {
        defaultPersistenceService.setJson(VOLUNTEER_CACHE_KEY, response.data)
        return response.data
      }

      return defaultPersistenceService.getJson<VolunteerAssignment[]>(VOLUNTEER_CACHE_KEY) ?? []
    },
  }
}
