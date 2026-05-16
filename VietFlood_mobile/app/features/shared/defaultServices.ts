import { api } from "@/services/api"
import * as storage from "@/utils/storage"

import type {
  ApiRequestOptions,
  ApiResponseEnvelope,
  ApiService,
  ErrorReporter,
  PersistenceService,
  WeatherService,
} from "./contracts"
import { consoleErrorReporter } from "./errors"
import { deriveOfflineStatus } from "./offline"
import type { UserRole } from "./types"

export const defaultApiService: ApiService = {
  async request<TData>(
    method: "get" | "post" | "put" | "patch" | "delete",
    path: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponseEnvelope<TData>> {
    const headers = options?.headers
    const params = options?.query

    const response =
      method === "get"
        ? await api.apisauce.get<TData>(path, params, { headers })
        : method === "post"
          ? await api.apisauce.post<TData>(path, options?.body, { headers, params })
          : method === "put"
            ? await api.apisauce.put<TData>(path, options?.body, { headers, params })
            : method === "patch"
              ? await api.apisauce.patch<TData>(path, options?.body, { headers, params })
              : await api.apisauce.delete<TData>(path, params, { headers })

    return {
      ok: response.ok,
      status: response.status ?? 0,
      data: response.data as TData | undefined,
      error: response.problem ?? undefined,
      offlineStatus: deriveOfflineStatus({
        isNetworkError: !response.ok && response.problem === "NETWORK_ERROR",
        hasCachedData: false,
        queued: false,
      }),
    }
  },
}

export const defaultPersistenceService: PersistenceService = {
  getString: storage.loadString,
  setString: storage.saveString,
  remove: storage.remove,
  getJson: storage.load,
  setJson: storage.save,
}

export const defaultWeatherService: WeatherService = {
  async getCurrent() {
    return {
      temperatureC: 0,
      condition: "unknown",
      observedAt: new Date().toISOString(),
    }
  },
}

export const defaultErrorReporter: ErrorReporter = consoleErrorReporter

export function buildSessionFromRaw(value: { token: string; email: string; role: UserRole }) {
  return {
    token: value.token,
    email: value.email,
    role: value.role,
    signedInAt: new Date().toISOString(),
  }
}
