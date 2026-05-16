import { create, type ApisauceInstance } from "apisauce"

import Config from "@/config"

import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem"
import type { DistrictDivision, ProvinceDivision, WardDivision } from "./types"

export type GetProvincesResult = { kind: "ok"; data: ProvinceDivision[] } | GeneralApiProblem
export type GetDistrictsResult = { kind: "ok"; data: DistrictDivision[] } | GeneralApiProblem
export type GetWardsResult = { kind: "ok"; data: WardDivision[] } | GeneralApiProblem

export class LocationService {
  private readonly api: ApisauceInstance

  constructor() {
    this.api = create({
      baseURL: Config.VIETNAM_DIVISIONS_API_URL,
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    })
  }

  async getProvinces(): Promise<GetProvincesResult> {
    try {
      const response = await this.api.get<ProvinceDivision[]>("/p/")

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: response.data ?? [] }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  async getDistrictsByProvince(provinceCode: number): Promise<GetDistrictsResult> {
    try {
      const response = await this.api.get<ProvinceDivision>(`/p/${provinceCode}`, { depth: 2 })

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: response.data?.districts ?? [] }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }

  async getWardsByDistrict(districtCode: number): Promise<GetWardsResult> {
    try {
      const response = await this.api.get<DistrictDivision>(`/d/${districtCode}`, { depth: 2 })

      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
        return { kind: "bad-data" }
      }

      return { kind: "ok", data: response.data?.wards ?? [] }
    } catch {
      return { kind: "unknown", temporary: true }
    }
  }
}

export const locationService = new LocationService()
