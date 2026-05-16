/**
 * Report service for handling all report-related API calls
 */
import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem"
import type {
  CreateReportRequest,
  DeleteUserResponse,
  GetAllReportsResponse,
  ImageAsset,
  Report,
  ReportCategoryInput,
  ReportStatus,
  UpdateReportRequest,
  UpdateReportStatusRequest,
  User,
  UserWithReportCount,
  GetUsersWithReportsResponse,
  GetUserReportsResponse,
} from "./types"

import { Api } from "./index"
import { api } from "./index"

export type CreateReportResult = { kind: "ok"; data: Report } | GeneralApiProblem

export type GetReportsResult = { kind: "ok"; data: Report[] } | GeneralApiProblem

export type GetAllReportsAdminResult =
  | { kind: "ok"; data: GetAllReportsResponse }
  | GeneralApiProblem

export type GetReportResult = { kind: "ok"; data: Report } | GeneralApiProblem

export type UpdateReportResult = { kind: "ok"; data: Report } | GeneralApiProblem

export type DeleteReportResult = { kind: "ok"; data: DeleteUserResponse } | GeneralApiProblem

export type GetUsersWithReportsResult =
  | { kind: "ok"; data: GetUsersWithReportsResponse }
  | GeneralApiProblem

export type GetUserReportsListResult =
  | { kind: "ok"; data: GetUserReportsResponse }
  | GeneralApiProblem

type RawRecord = Record<string, unknown>
type RawReportEnvelope = RawRecord & {
  report?: RawRecord
  user?: RawRecord
}

/**
 * Report Service - handles all report API operations
 */
export class ReportService {
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

  private getRecordValue(record: RawRecord | null | undefined, keys: string[]): unknown {
    if (!record) return undefined

    for (const key of keys) {
      const value = record[key]
      if (value !== null && value !== undefined) {
        return value
      }
    }

    return undefined
  }

  private toLooseText(value: unknown): string | undefined {
    const directValue = this.toOptionalString(value)
    if (directValue) return directValue

    if (Array.isArray(value)) {
      for (const item of value) {
        const candidate = this.toLooseText(item)
        if (candidate) return candidate
      }
      return undefined
    }

    const record = this.asRecord(value)
    if (!record) return undefined

    return this.toLooseText(
      this.getRecordValue(record, [
        "name",
        "label",
        "value",
        "title",
        "province",
        "province_name",
        "provinceName",
        "district",
        "district_name",
        "districtName",
        "ward",
        "ward_name",
        "wardName",
        "address_line",
        "addressLine",
        "category",
        "category_name",
        "categoryName",
      ]),
    )
  }

  private getRecordText(record: RawRecord | null | undefined, keys: string[]): string | undefined {
    return this.toLooseText(this.getRecordValue(record, keys))
  }

  private normalizeReportStatus(value: unknown): ReportStatus {
    const normalizedValue = this.toOptionalString(value)?.toLowerCase()

    switch (normalizedValue) {
      case "pending":
        return "pending"
      case "in_progress":
      case "in-progress":
        return "in-progress"
      case "completed":
      case "resolved":
        return "resolved"
      case "verified":
        return "verified"
      case "rejected":
        return "rejected"
      default:
        return "pending"
    }
  }

  private extractCategoryValues(value: unknown): string[] {
    if (value === null || value === undefined) {
      return []
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim()
      if (!trimmedValue) return []

      try {
        return this.extractCategoryValues(JSON.parse(trimmedValue))
      } catch {
        return trimmedValue
          .split(/[,;|]/)
          .map((item) => item.trim())
          .filter(Boolean)
      }
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractCategoryValues(item))
    }

    const record = this.asRecord(value)
    if (!record) {
      return this.toOptionalString(value) ? [String(value).trim()] : []
    }

    return this.extractCategoryValues(
      this.getRecordValue(record, [
        "value",
        "label",
        "name",
        "title",
        "category",
        "category_name",
        "categoryName",
        "categories",
      ]),
    )
  }

  private normalizeCategory(value: unknown): string {
    return Array.from(new Set(this.extractCategoryValues(value))).join(",")
  }

  private appendCategoryFields(formData: FormData, categories?: ReportCategoryInput[]) {
    Array.from(new Set(this.extractCategoryValues(categories))).forEach((category) => {
      formData.append("category", category)
    })
  }

  private normalizeImageList(...sources: unknown[]): string[] | undefined {
    const normalizedImages = sources.flatMap((source) => {
      if (!Array.isArray(source)) return []

      return source
        .map((item) => {
          if (typeof item === "string") return item

          const record = this.asRecord(item)
          return (
            this.toOptionalString(record?.url) ??
            this.toOptionalString(record?.uri) ??
            this.toOptionalString(record?.path) ??
            this.toOptionalString(record?.imageUrl)
          )
        })
        .filter((item): item is string => Boolean(item))
    })

    return normalizedImages.length > 0 ? normalizedImages : undefined
  }

  private splitFullName(
    fullName?: string,
    existingFirstName?: string,
    existingLastName?: string,
  ): Pick<User, "first_name" | "last_name"> {
    if (existingFirstName || existingLastName) {
      return {
        first_name: existingFirstName ?? "",
        last_name: existingLastName ?? "",
      }
    }

    if (!fullName) {
      return {
        first_name: "",
        last_name: "",
      }
    }

    const nameParts = fullName.split(/\s+/).filter(Boolean)
    if (nameParts.length <= 1) {
      return {
        first_name: fullName,
        last_name: "",
      }
    }

    return {
      first_name: nameParts.slice(0, -1).join(" "),
      last_name: nameParts[nameParts.length - 1],
    }
  }

  private normalizeUserRole(value: unknown): User["role"] {
    const normalizedValue = this.toOptionalString(value)?.toLowerCase()

    switch (normalizedValue) {
      case "admin":
        return "admin"
      case "relief":
        return "relief"
      default:
        return "user"
    }
  }

  private normalizeReporter(
    rawUser: unknown,
    fallbackUserId: number,
    createdAt: string,
    updatedAt: string,
  ): User | undefined {
    const userRecord = this.asRecord(rawUser)
    if (!userRecord && !fallbackUserId) {
      return undefined
    }

    const fullName = this.toOptionalString(userRecord?.name)
    const username = this.toOptionalString(userRecord?.username) ?? ""
    const phone = this.toOptionalString(userRecord?.phone) ?? ""
    const email = this.toOptionalString(userRecord?.email) ?? ""
    const explicitFirstName = this.toOptionalString(userRecord?.first_name ?? userRecord?.firstName)
    const explicitLastName = this.toOptionalString(userRecord?.last_name ?? userRecord?.lastName)
    const hasReporterData = Boolean(fullName || username || phone || email || fallbackUserId)

    if (!hasReporterData) {
      return undefined
    }

    const { first_name, last_name } = this.splitFullName(
      fullName,
      explicitFirstName,
      explicitLastName,
    )

    return {
      id: this.toOptionalNumber(userRecord?.id) ?? fallbackUserId,
      username,
      email,
      phone,
      first_name,
      middle_name: this.toOptionalString(userRecord?.middle_name ?? userRecord?.middleName),
      last_name,
      date_of_birth: this.toOptionalString(userRecord?.date_of_birth ?? userRecord?.dateOfBirth),
      province: this.toOptionalString(userRecord?.province),
      district: this.toOptionalString(userRecord?.district),
      ward: this.toOptionalString(userRecord?.ward),
      address_line: this.toOptionalString(userRecord?.address_line ?? userRecord?.addressLine),
      role: this.normalizeUserRole(userRecord?.role),
      created_at:
        this.toOptionalString(userRecord?.created_at ?? userRecord?.createdAt) ?? createdAt,
      updated_at:
        this.toOptionalString(userRecord?.updated_at ?? userRecord?.updatedAt) ?? updatedAt,
    }
  }

  private normalizeReport(rawItem: unknown): Report {
    const envelope = this.asRecord(rawItem) as RawReportEnvelope | null
    const reportRecord = this.asRecord(envelope?.report) ?? envelope ?? {}
    const locationRecord =
      this.asRecord(reportRecord.location) ??
      this.asRecord(reportRecord.address) ??
      this.asRecord(reportRecord.division)
    const createdAt = this.toOptionalString(reportRecord.created_at ?? reportRecord.createdAt) ?? ""
    const updatedAt =
      this.toOptionalString(reportRecord.updated_at ?? reportRecord.updatedAt) ?? createdAt
    const userId =
      this.toOptionalNumber(reportRecord.user_id ?? reportRecord.userId) ??
      this.toOptionalNumber(envelope?.user?.id) ??
      0
    const addressLine =
      this.getRecordText(reportRecord, [
        "address_line",
        "addressLine",
        "street_address",
        "streetAddress",
      ]) ??
      this.getRecordText(locationRecord, [
        "address_line",
        "addressLine",
        "street_address",
        "streetAddress",
      ]) ??
      ""
    const province =
      this.getRecordText(reportRecord, ["province", "province_name", "provinceName"]) ??
      this.getRecordText(locationRecord, ["province", "province_name", "provinceName"]) ??
      ""
    const district =
      this.getRecordText(reportRecord, ["district", "district_name", "districtName"]) ??
      this.getRecordText(locationRecord, ["district", "district_name", "districtName"])
    const ward =
      this.getRecordText(reportRecord, ["ward", "ward_name", "wardName"]) ??
      this.getRecordText(locationRecord, ["ward", "ward_name", "wardName"])
    const latitude = this.toOptionalNumber(reportRecord.latitude ?? reportRecord.lat)
    const longitude = this.toOptionalNumber(reportRecord.longitude ?? reportRecord.lng)
    const createdBySource =
      this.asRecord(reportRecord.created_by ?? reportRecord.createdBy) ?? envelope?.user
    const categoryValue = this.getRecordValue(reportRecord, [
      "category",
      "categories",
      "category_name",
      "categoryName",
      "report_category",
      "reportCategory",
    ])

    return {
      id: this.toOptionalNumber(reportRecord.id) ?? 0,
      user_id: userId,
      category: this.normalizeCategory(categoryValue),
      description: this.toOptionalString(reportRecord.description) ?? "",
      status: this.normalizeReportStatus(reportRecord.status),
      province,
      district,
      ward,
      address_line: addressLine,
      latitude,
      longitude,
      images: this.normalizeImageList(reportRecord.images, reportRecord.evidences),
      created_at: createdAt,
      updated_at: updatedAt,
      created_by: this.normalizeReporter(createdBySource, userId, createdAt, updatedAt),
      userId,
      addressLine,
      createdAt,
      updatedAt,
      lat: latitude,
      lng: longitude,
      createdBy: this.normalizeReporter(createdBySource, userId, createdAt, updatedAt),
      title:
        this.toOptionalString(reportRecord.title) ??
        this.toOptionalString(reportRecord.description) ??
        "",
    } as Report
  }

  private extractRawReports(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload
    }

    const payloadRecord = this.asRecord(payload)
    if (Array.isArray(payloadRecord?.reports)) {
      return payloadRecord.reports
    }

    if (payloadRecord) {
      if (Array.isArray(payloadRecord.data)) {
        return payloadRecord.data
      }

      if (payloadRecord.report || payloadRecord.id) {
        return [payloadRecord]
      }
    }

    return []
  }

  private normalizeReportList(payload: unknown): Report[] {
    return this.extractRawReports(payload)
      .map((item) => this.normalizeReport(item))
      .filter((report) => report.id > 0)
  }

  private normalizeReportCollection(payload: unknown): GetAllReportsResponse {
    const payloadRecord = this.asRecord(payload)
    const reports = this.normalizeReportList(payload)

    return {
      reports,
      total: this.toOptionalNumber(payloadRecord?.total) ?? reports.length,
      page: this.toOptionalNumber(payloadRecord?.page) ?? 1,
      limit: this.toOptionalNumber(payloadRecord?.limit) ?? reports.length,
    }
  }

  private appendImages(formData: FormData, images?: ImageAsset[]) {
    images?.forEach((image: ImageAsset) => {
      const fileName = image.fileName ?? `photo_${Date.now()}.jpg`
      const mimeType = image.mimeType ?? "image/jpeg"
      formData.append("files", { uri: image.uri, name: fileName, type: mimeType } as any)
    })
  }

  private buildCreateReportFormData(reportData: CreateReportRequest) {
    const formData = new FormData()
    this.appendCategoryFields(formData, reportData.category)
    formData.append("description", reportData.description)
    formData.append("province", reportData.province)
    if (reportData.district) formData.append("district", reportData.district)
    if (reportData.ward) formData.append("ward", reportData.ward)
    formData.append("addressLine", reportData.addressLine)
    formData.append("userId", String(reportData.userId))

    this.appendImages(formData, reportData.images)
    return formData
  }

  private buildUpdateReportFormData(updates: UpdateReportRequest) {
    const formData = new FormData()

    if (updates.category) this.appendCategoryFields(formData, updates.category)
    if (updates.description) formData.append("description", updates.description)
    if (updates.province) formData.append("province", updates.province)
    if (updates.district) formData.append("district", updates.district)
    if (updates.ward) formData.append("ward", updates.ward)
    if (updates.addressLine) formData.append("addressLine", updates.addressLine)
    if (updates.status) formData.append("status", updates.status)
    if (updates.existing_images) {
      formData.append("existing_images", JSON.stringify(updates.existing_images))
    }

    this.appendImages(formData, updates.images)
    return formData
  }

  private buildReliefUpdateFormData(updates: UpdateReportStatusRequest) {
    const formData = new FormData()

    if (updates.category) formData.append("category", String(updates.category))
    if (updates.description) formData.append("description", updates.description)
    if (updates.status) formData.append("status", updates.status)

    return formData
  }

  /**
   * Create a new report with optional images
   * @param reportData - Report data (category, description, location, optional images)
   * @returns Created report or error
   */
  async createReport(reportData: CreateReportRequest): Promise<CreateReportResult> {
    try {
      const payload = this.buildCreateReportFormData(reportData)

      const response = await this.api.postWithRetry<Report>("/reports/create", payload, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      })

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: this.normalizeReport(response.data) }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Get all reports submitted by current user
   * @returns Array of user's reports or error
   */
  async getUserReports(): Promise<GetReportsResult> {
    try {
      const response = await this.api.authenticatedGet<unknown>("/reports/user")

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: this.normalizeReportList(response.data) }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Get all reports (admin/relief only)
   * @returns All reports with metadata or error
   */
  async getAllReports(): Promise<GetAllReportsAdminResult> {
    try {
      const response = await this.api.authenticatedGet<unknown>("/reports")

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: this.normalizeReportCollection(response.data) }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Get a single report for relief/admin flows using the documented GET /reports endpoint.
   */
  async getReportForRelief(reportId: number): Promise<GetReportResult> {
    try {
      const allReports = await this.getAllReports()
      if (allReports.kind !== "ok") {
        return allReports
      }

      const report = allReports.data.reports.find((item) => item.id === reportId)
      if (!report) {
        return { kind: "not-found" }
      }

      return { kind: "ok", data: report }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Update report as user (creator)
   * @param reportId - Report ID to update
   * @param updates - Fields to update (description, status, optional new images)
   * @returns Updated report or error
   */
  async updateReport(reportId: number, updates: UpdateReportRequest): Promise<UpdateReportResult> {
    try {
      const payload = this.buildUpdateReportFormData(updates)

      const response = await this.api.apisauce.put<Report>(`/reports/update/${reportId}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      })

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: this.normalizeReport(response.data) }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Update report status as relief staff
   */
  async updateReportStatus(
    reportId: number,
    userId: number,
    updates: UpdateReportStatusRequest,
  ): Promise<UpdateReportResult> {
    try {
      const payload = this.buildReliefUpdateFormData(updates)
      const response = await this.api.apisauce.put<Report>(
        `/reports/relief/${reportId}/user/${userId}`,
        payload,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      )

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: this.normalizeReport(response.data) }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Delete report as user (creator)
   * @param reportId - Report ID to delete
   * @returns Deletion status or error
   */
  async deleteReport(reportId: number): Promise<DeleteReportResult> {
    try {
      const response = await this.api.apisauce.delete<DeleteUserResponse>(`/reports/${reportId}`)

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
   * Delete report as admin
   * @param reportId - Report ID to delete
   * @param adminId - Admin user ID
   * @returns Deletion status or error
   */
  async deleteReportAdmin(reportId: number, adminId: number): Promise<DeleteReportResult> {
    try {
      const response = await this.api.apisauce.delete<DeleteUserResponse>(
        `/reports/update/${reportId}/admin/${adminId}`,
      )

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
   * Delete report as relief staff
   * @param reportId - Report ID to delete
   * @param userId - Relief staff user ID
   * @returns Deletion status or error
   */
  async deleteReportRelief(reportId: number, userId: number): Promise<DeleteReportResult> {
    try {
      const response = await this.api.apisauce.delete<DeleteUserResponse>(
        `/reports/relief/${reportId}/user/${userId}`,
      )

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
   * ============== Relief-Specific Methods ==============
   */

  /**
   * Get all users who have submitted reports (relief staff view)
   * Fetches all reports and groups them by reporter to provide user summary
   * @returns List of users with their report counts
   */
  async getUsersWithReports(): Promise<GetUsersWithReportsResult> {
    try {
      const allReports = await this.getAllReports()
      if (allReports.kind !== "ok") {
        return allReports
      }

      const reportsData = allReports.data.reports
      const userMap = new Map<number, UserWithReportCount>()
      const userReportCounts = new Map<number, number>()

      reportsData.forEach((report: Report) => {
        const userId = report.user_id
        const reporter = report.created_by

        // Count reports per user
        userReportCounts.set(userId, (userReportCounts.get(userId) || 0) + 1)

        if (userId && reporter && !userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            username: reporter.username || "",
            first_name: reporter.first_name || "",
            last_name: reporter.last_name || "",
            phone: reporter.phone || "",
            reportCount: userReportCounts.get(userId) || 0,
            lastReportAt: report.created_at,
          })
        }
      })

      // Update report counts
      Array.from(userMap.values()).forEach((user) => {
        user.reportCount = userReportCounts.get(user.id) || 0
      })

      return {
        kind: "ok",
        data: {
          users: Array.from(userMap.values()),
          total: Array.from(userMap.values()).length,
        },
      }
    } catch (error) {
      console.error("[ReportService] Error getting users with reports:", error)
      return { kind: "unknown", temporary: true }
    }
  }

  /**
   * Get all reports submitted by a specific user (relief staff view)
   * Fetches all reports and filters by user ID
   * @param userId - User ID to get reports for
   * @returns List of reports from that user
   */
  async getUserReportsForRelief(userId: number): Promise<GetUserReportsListResult> {
    try {
      const allReports = await this.getAllReports()
      if (allReports.kind !== "ok") {
        return allReports
      }

      const userReports = allReports.data.reports.filter(
        (report: Report) => report.user_id === userId,
      )

      return {
        kind: "ok",
        data: {
          reports: userReports,
          total: userReports.length,
          page: 1,
          limit: userReports.length,
        },
      }
    } catch (error) {
      console.error("[ReportService] Error getting user reports for relief:", error)
      return { kind: "unknown", temporary: true }
    }
  }
}

export const reportService = new ReportService(api)
