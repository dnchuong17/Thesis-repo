/**
 * These types indicate the shape of the data you expect to receive from your
 * API endpoint, assuming it's a JSON object like we have.
 */
export interface EpisodeItem {
  title: string
  pubDate: string
  link: string
  guid: string
  author: string
  thumbnail: string
  description: string
  content: string
  enclosure: {
    link: string
    type: string
    length: number
    duration: number
    rating: { scheme: string; value: string }
  }
  categories: string[]
}

export interface ApiFeedResponse {
  status: string
  feed: {
    url: string
    title: string
    link: string
    author: string
    description: string
    image: string
  }
  items: EpisodeItem[]
}

/**
 * The options used to configure apisauce.
 */
export interface ApiConfig {
  /**
   * The URL of the api.
   */
  url: string

  /**
   * Milliseconds before we timeout the request.
   */
  timeout: number
}

/**
 * ============== Authentication API Types ==============
 */

export interface AuthSignInRequest {
  username: string
  password: string
}

export interface AuthSignInResponse {
  accessToken?: string
  access_token?: string // Backend returns snake_case on refresh endpoint
  refreshToken?: string // Made optional as some backends don't return this
  refresh_token?: string // Backend returns snake_case
  user: User
}

export interface AuthRegisterRequest {
  email: string
  username: string
  password: string
  phone: string
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth: string
  province: string
  district: string
  ward: string
  address_line: string
}

export interface AuthRegisterResponse {
  id: number
  username: string
  email: string
  phone: string
  first_name: string
  last_name: string
  role: "user" | "relief" | "admin"
  created_at: string
}

export interface AuthRefreshTokenRequest {
  refresh: string
}

export interface AuthRefreshTokenResponse {
  accessToken?: string
  access_token?: string // Backend returns snake_case
  refreshToken?: string
  refresh_token?: string // Backend returns snake_case
}

/**
 * Normalize auth response by mapping snake_case to camelCase
 * Ensures consistent property names regardless of backend response format
 */
export function normalizeAuthResponse<
  T extends {
    accessToken?: string
    access_token?: string
    refreshToken?: string
    refresh_token?: string
  },
>(data: T): T & { accessToken: string } {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response data for normalization")
  }

  // Map snake_case to camelCase
  if (!data.accessToken && data.access_token) {
    data.accessToken = data.access_token
  }
  if (!data.refreshToken && data.refresh_token) {
    data.refreshToken = data.refresh_token
  }

  if (!data.accessToken) {
    throw new Error("No access token found in response after normalization")
  }

  return data as T & { accessToken: string }
}

export interface User {
  id: number
  username: string
  email: string
  phone: string
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth?: string
  province?: string
  district?: string
  ward?: string
  address_line?: string
  role: "user" | "resident" | "volunteer" | "relief" | "coordinator" | "admin"
  created_at: string
  updated_at: string
}

/**
 * ============== Report API Types ==============
 */

export enum ReportCategory {
  FLOOD = "flood",
  INCIDENT = "incident",
  INFRASTRUCTURE = "infrastructure",
  RESCUE = "rescue",
}
export type ReportStatus =
  | "pending"
  | "in-progress"
  | "resolved"
  | "verified"
  | "rejected"
  | "completed"

export interface Report {
  id: number
  user_id: number
  category: string
  description: string
  status: ReportStatus
  province: string
  district?: string
  ward?: string
  address_line: string
  latitude?: number
  longitude?: number
  images?: string[]
  created_at: string
  updated_at: string
  created_by?: User
}

export interface ImageAsset {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
}

export type ReportCategoryInput = ReportCategory | string

export interface CreateReportRequest {
  category: ReportCategoryInput[]
  description: string
  province: string
  district?: string
  ward?: string
  addressLine: string
  userId: number
  images?: ImageAsset[]
}

export interface UpdateReportRequest {
  category?: ReportCategoryInput[]
  description?: string
  province?: string
  district?: string
  ward?: string
  addressLine?: string
  status?: ReportStatus
  images?: ImageAsset[]
  existing_images?: string[]
}

export interface UpdateReportStatusRequest {
  category?: ReportCategory
  description?: string
  status?: ReportStatus
}

export interface GetAllReportsResponse {
  reports: Report[]
  total: number
  page: number
  limit: number
}

export interface UserWithReportCount {
  id: number
  username: string
  first_name: string
  last_name: string
  phone: string
  reportCount: number
  lastReportAt?: string
}

export interface GetUsersWithReportsResponse {
  users: UserWithReportCount[]
  total: number
}

export interface GetUserReportsResponse {
  reports: Report[]
  total: number
  page: number
  limit: number
}

/**
 * ============== User Management API Types ==============
 */

export interface GetAllUsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
}

export interface UpdateUserProfileRequest {
  phone?: string
  email?: string
  first_name?: string
  last_name?: string
  province?: string
  district?: string
  ward?: string
  address_line?: string
}

export interface DeleteUserResponse {
  message: string
  success: boolean
}

/**
 * ============== Vietnam Divisions API Types ==============
 */

export interface DivisionOption {
  name: string
  code: number
}

export interface WardDivision extends DivisionOption {
  division_type: string
  codename: string
  district_code: number
}

export interface DistrictDivision extends DivisionOption {
  division_type: string
  codename: string
  province_code: number
  wards?: WardDivision[]
}

export interface ProvinceDivision extends DivisionOption {
  division_type: string
  codename: string
  phone_code: number
  districts?: DistrictDivision[]
}
