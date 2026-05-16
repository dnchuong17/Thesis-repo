import { defaultApiService, defaultErrorReporter } from "@/features/shared"
import type { UserRole } from "@/features/shared"
import { defaultRbacService } from "@/features/shared/rbac"

export interface ReliefRequest {
  id: string
  title: string
  assigned: boolean
}

export interface ReliefFeatureApi {
  listReliefRequests(): Promise<ReliefRequest[]>
  assignReliefRequest(requestId: string, role: UserRole): Promise<boolean>
}

export function createReliefFeature(): ReliefFeatureApi {
  return {
    async listReliefRequests() {
      const response = await defaultApiService.request<ReliefRequest[]>("get", "/relief/requests")
      return response.data ?? []
    },
    async assignReliefRequest(requestId, role) {
      const allowed = defaultRbacService.hasAnyRole(role, ["coordinator", "admin"])
      if (!allowed) {
        return false
      }

      try {
        const response = await defaultApiService.request<{ ok: boolean }>(
          "post",
          "/relief/assign",
          {
            body: { requestId },
          },
        )
        return response.ok
      } catch (error) {
        defaultErrorReporter.capture(error, {
          feature: "relief",
          action: "assignReliefRequest",
          detail: { requestId },
        })
        return false
      }
    },
  }
}
