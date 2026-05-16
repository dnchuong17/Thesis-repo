/**
 * User service for handling user management API calls (admin only)
 */
import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem"
import type {
  DeleteUserResponse,
  GetAllUsersResponse,
  UpdateUserProfileRequest,
  User,
} from "./types"

import { Api } from "./index"
import { api } from "./index"

export type GetAllUsersResult = { kind: "ok"; data: GetAllUsersResponse } | GeneralApiProblem

export type UpdateUserProfileResult = { kind: "ok"; data: User } | GeneralApiProblem

export type DeleteUserResult = { kind: "ok"; data: DeleteUserResponse } | GeneralApiProblem

type RawRecord = Record<string, unknown>

/**
 * User Service - handles user management API operations
 */
export class UserService {
  api: Api

  constructor(api: Api) {
    this.api = api
  }

  private asRecord(value: unknown): RawRecord | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null
    }

    return value as RawRecord
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value === "string") {
      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : undefined
    }

    if (typeof value === "number") {
      return String(value)
    }

    return undefined
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsedValue = Number(value)
      return Number.isFinite(parsedValue) ? parsedValue : undefined
    }

    return undefined
  }

  private normalizeUserRole(
    value: unknown,
  ): User["role"] | "resident" | "coordinator" | "volunteer" {
    const normalizedValue = this.toOptionalString(value)?.toLowerCase()

    switch (normalizedValue) {
      case "admin":
      case "administrator":
        return "admin"
      case "coordinator":
      case "relief_coordinator":
      case "relief-coordinator":
        return "coordinator"
      case "relief":
      case "relief_staff":
      case "relief-staff":
      case "rescue":
        return "volunteer"
      case "citizen":
      case "resident":
        return "resident"
      case "user":
        return "user"
      default:
        return "user"
    }
  }

  private normalizeUser(rawUser: unknown): User {
    const userRecord = this.asRecord(rawUser) ?? {}
    const createdAt = this.toOptionalString(userRecord.created_at ?? userRecord.createdAt) ?? ""
    const updatedAt =
      this.toOptionalString(userRecord.updated_at ?? userRecord.updatedAt) ?? createdAt

    return {
      id: this.toOptionalNumber(userRecord.id) ?? 0,
      username: this.toOptionalString(userRecord.username) ?? "",
      email: this.toOptionalString(userRecord.email) ?? "",
      phone: this.toOptionalString(userRecord.phone) ?? "",
      first_name: this.toOptionalString(userRecord.first_name ?? userRecord.firstName) ?? "",
      middle_name: this.toOptionalString(userRecord.middle_name ?? userRecord.middleName),
      last_name: this.toOptionalString(userRecord.last_name ?? userRecord.lastName) ?? "",
      date_of_birth: this.toOptionalString(userRecord.date_of_birth ?? userRecord.dateOfBirth),
      province: this.toOptionalString(userRecord.province),
      district: this.toOptionalString(userRecord.district),
      ward: this.toOptionalString(userRecord.ward),
      address_line: this.toOptionalString(userRecord.address_line ?? userRecord.addressLine),
      role: this.normalizeUserRole(userRecord.role) as User["role"],
      created_at: createdAt,
      updated_at: updatedAt,
    }
  }

  private normalizeUsersCollection(
    payload: unknown,
    page: number,
    limit: number,
  ): GetAllUsersResponse {
    if (Array.isArray(payload)) {
      const users = payload.map((item) => this.normalizeUser(item)).filter((user) => user.id > 0)
      return {
        users,
        total: users.length,
        page,
        limit,
      }
    }

    const payloadRecord = this.asRecord(payload)
    const rawUsers = Array.isArray(payloadRecord?.users) ? payloadRecord.users : []
    const users = rawUsers.map((item) => this.normalizeUser(item)).filter((user) => user.id > 0)

    return {
      users,
      total: this.toOptionalNumber(payloadRecord?.total) ?? users.length,
      page: this.toOptionalNumber(payloadRecord?.page) ?? page,
      limit: this.toOptionalNumber(payloadRecord?.limit) ?? limit,
    }
  }

  /**
   * Get all users in the system (admin/relief only)
   */
  async getAllUsers(page: number = 1, limit: number = 20): Promise<GetAllUsersResult> {
    try {
      const response = await this.api.apisauce.get<unknown>("/auth/all", {
        page,
        limit,
      })

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: this.normalizeUsersCollection(response.data, page, limit) }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Update another user's profile (admin/relief only)
   */
  async updateUserProfile(
    userId: number,
    updates: UpdateUserProfileRequest,
  ): Promise<UpdateUserProfileResult> {
    try {
      const response = await this.api.apisauce.put<User>(`/auth/update/user/${userId}`, updates)

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: response.data! }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Delete user account (admin only)
   */
  async deleteUser(userId: number): Promise<DeleteUserResult> {
    try {
      const response = await this.api.apisauce.delete<DeleteUserResponse>(`/auth/delete/${userId}`)

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: response.data! }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Check if current user has admin role (local check)
   */
  hasAdminRole(userRole?: string): boolean {
    return userRole === "admin"
  }

  /**
   * Check if current user has relief role (local check)
   */
  hasReliefRole(userRole?: string): boolean {
    return userRole === "relief" || userRole === "admin"
  }
}
export const userService = new UserService(api)
