/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApisauceInstance, create } from "apisauce"
import type { ApiResponse } from "apisauce"

import Config from "@/config"

import {
  getAccessToken,
  saveActiveSessionTokens,
  getRefreshToken,
  clearTokens,
} from "./tokenStorage"
import type { ApiConfig } from "./types"
import { normalizeAuthResponse } from "./types"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

// Prevent multiple simultaneous refresh attempts
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  private buildAuthHeaders(token: string | null) {
    return {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  private async getRefreshedTokenForRetry(): Promise<string | null> {
    try {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = this.attemptTokenRefresh()
      }

      const newToken = await refreshPromise
      return newToken
    } finally {
      refreshPromise = null
      isRefreshing = false
    }
  }

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    })

    // Add async request interceptor for token injection.
    // Using addAsyncRequestTransform ensures token retrieval is awaited before request dispatch.
    this.apisauce.addAsyncRequestTransform(async (request) => {
      try {
        // Skip auth for refresh endpoint - it uses refresh token in body, not Bearer header
        if (request.url?.includes("/auth/refresh_token")) {
          console.log("[API] Refresh endpoint - skipping Authorization header")
          return
        }

        const token = await getAccessToken()
        if (token) {
          request.headers!.Authorization = `Bearer ${token}`
          console.log(
            `[API] Authorization header set with token (length: ${token.length}, prefix: ${token.substring(0, 20)}...)`,
          )
        } else {
          console.log("[API] No access token found in storage")
        }

        // Log full request details for debugging
        console.log("[API] Full Request:")
        console.log(`  - URL: ${request.url}`)
        console.log(`  - Method: ${request.method}`)
        console.log(`  - Headers:`, request.headers)
      } catch (error) {
        console.error("Error adding authorization token:", error)
      }
    })

    // Add response interceptor for 401 handling and logging
    this.apisauce.addResponseTransform(async (response) => {
      // Log response for debugging (sanitize sensitive data)
      const logResponse = {
        status: response.status,
        ok: response.ok,
        problem: response.problem,
        url: response.config?.url,
      }
      console.log("[API Response]", logResponse)

      // Log response data if available
      if (response.data) {
        console.log("[API Response Data]", response.data)
      }
    })
  }

  /**
   * Attempt to refresh token with queuing to prevent duplicates
   */
  private async attemptTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        console.log("[API] No refresh token available")
        return null
      }

      const refreshResponse = await this.refreshAccessToken(refreshToken)
      if (refreshResponse.ok && refreshResponse.data) {
        try {
          const data = normalizeAuthResponse(refreshResponse.data as any)
          if (!data.accessToken) {
            console.log("[API] Token refresh returned no access token", { data })
            return null
          }
          console.log("[API] Token refresh successful")
          return data.accessToken
        } catch (error) {
          console.error("[API] Error normalizing refresh response:", error)
          return null
        }
      }

      console.log("[API] Token refresh endpoint returned error", {
        ok: refreshResponse.ok,
        status: refreshResponse.status,
        data: refreshResponse.data,
      })
      return null
    } catch (error) {
      console.error("[API] Error during token refresh:", error)
      return null
    }
  }

  /**
   * Ensure token is loaded before making request (wrapper for safety)
   */
  async ensureToken(): Promise<void> {
    const token = await getAccessToken()
    if (!token) {
      console.warn("[API] No access token available - request will likely fail with 401")
    }
  }

  /**
   * Make authenticated GET request with explicit token injection
   * This bypasses the async request interceptor to ensure token is always set
   */
  async authenticatedGet<T>(url: string): Promise<ApiResponse<T>> {
    const token = await getAccessToken()
    const headers = this.buildAuthHeaders(token)

    console.log("[API] Making authenticated GET request:")
    console.log(`  - URL: ${this.config.url}${url}`)
    console.log(`  - Headers:`, headers)

    let response = await this.apisauce.get<T>(url, undefined, { headers })

    if (response.status === 401) {
      console.log("[API] Authenticated GET returned 401, attempting token refresh")
      const refreshedToken = await this.getRefreshedTokenForRetry()

      if (refreshedToken) {
        response = await this.apisauce.get<T>(url, undefined, {
          headers: this.buildAuthHeaders(refreshedToken),
        })
      } else {
        console.log("[API] Token refresh failed after GET 401")
        await clearTokens()
      }
    }

    return response
  }

  /**
   * Make authenticated PUT request with explicit token injection
   * This bypasses the async request interceptor to ensure token is always set
   */
  async authenticatedPut<T>(url: string, data: any): Promise<ApiResponse<T>> {
    const token = await getAccessToken()
    const headers = this.buildAuthHeaders(token)

    console.log("[API] Making authenticated PUT request:")
    console.log(`  - URL: ${this.config.url}${url}`)
    console.log(`  - Headers:`, headers)

    let response = await this.apisauce.put<T>(url, data, { headers })

    if (response.status === 401) {
      console.log("[API] Authenticated PUT returned 401, attempting token refresh")
      const refreshedToken = await this.getRefreshedTokenForRetry()

      if (refreshedToken) {
        response = await this.apisauce.put<T>(url, data, {
          headers: this.buildAuthHeaders(refreshedToken),
        })
      } else {
        console.log("[API] Token refresh failed after PUT 401")
        await clearTokens()
      }
    }

    return response
  }

  /**
   * Refresh access token using refresh token
   * Note: This endpoint does NOT use Bearer auth - it uses refresh token in body
   */
  /**
   * Make POST request with automatic 401 retry on token refresh
   */
  async postWithRetry<T>(url: string, data: any, config?: any): Promise<ApiResponse<T>> {
    let response = await this.apisauce.post<T>(url, data, config)

    // If 401 and not refresh endpoint, try token refresh and retry once
    if (response.status === 401 && !url.includes("/auth/refresh_token")) {
      console.log("[API] Got 401, attempting token refresh and retry")
      try {
        // Attempt token refresh
        if (!isRefreshing) {
          isRefreshing = true
          refreshPromise = this.attemptTokenRefresh()
        }

        const newToken = await refreshPromise
        refreshPromise = null
        isRefreshing = false

        if (newToken) {
          console.log("[API] Token refreshed, retrying POST request")
          // Retry the request with updated token (will be injected by request interceptor)
          response = await this.apisauce.post<T>(url, data, config)
        } else {
          console.log("[API] Token refresh failed")
          await clearTokens()
        }
      } catch (error) {
        console.error("[API] Error during token refresh retry:", error)
        isRefreshing = false
        refreshPromise = null
      }
    }

    return response
  }

  private async refreshAccessToken(refreshToken: string) {
    try {
      // Make raw request without Authorization header
      const response = await this.apisauce.post("/auth/refresh_token", {
        refresh: refreshToken,
      })

      if (response.ok && response.data) {
        try {
          const data = normalizeAuthResponse(response.data as any)
          await saveActiveSessionTokens(data.accessToken, data.refreshToken || refreshToken)
          console.log("[API] Tokens saved after refresh")
        } catch (saveError) {
          console.error("[API] Failed to save tokens after refresh:", saveError)
          throw saveError
        }
      }

      return response
    } catch (error) {
      console.error("[API] Error refreshing token:", error)
      throw error
    }
  }
}

// Singleton instance of the API for convenience
export const api = new Api()
