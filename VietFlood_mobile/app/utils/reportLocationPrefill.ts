import * as Location from "expo-location"

import { locationService } from "@/services/api/locationService"
import type { DivisionOption } from "@/services/api/types"
import { getFastDeviceLocation } from "@/utils/deviceLocation"
import { load, save } from "@/utils/storage"

const REPORT_LOCATION_PREFILL_KEY = "ReportsScreen.locationPrefill"

export interface ReportLocationPrefill {
  province: string
  district: string
  ward: string
  addressLine: string
  selectedProvinceCode: number | null
  selectedDistrictCode: number | null
  selectedWardCode: number | null
  latitude: number
  longitude: number
  updatedAt: string
}

export interface WarmReportLocationPrefillResult {
  status: "granted" | "denied"
  prefill: ReportLocationPrefill | null
}

const ADMIN_PREFIXES = [
  "thanh pho",
  "tp",
  "tinh",
  "quan",
  "q",
  "huyen",
  "h",
  "thi xa",
  "tx",
  "thi tran",
  "tt",
  "phuong",
  "p",
  "xa",
]

function normalizeName(value?: string | null) {
  if (!value) return ""

  let normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()

  for (const prefix of ADMIN_PREFIXES) {
    const prefixPattern = new RegExp(`^${prefix}\\s+`, "i")
    normalized = normalized.replace(prefixPattern, "")
  }

  return normalized.trim()
}

function findOptionByCandidates(
  options: DivisionOption[],
  candidates: Array<string | undefined | null>,
) {
  const normalizedCandidates = candidates.map((item) => normalizeName(item)).filter(Boolean)
  if (normalizedCandidates.length === 0) return undefined

  const exactMatch = options.find((option) =>
    normalizedCandidates.includes(normalizeName(option.name)),
  )
  if (exactMatch) return exactMatch

  const rankedMatch = options
    .map((option) => {
      const normalizedOption = normalizeName(option.name)
      const score = normalizedCandidates.reduce((bestScore, candidate) => {
        if (!candidate) return bestScore
        if (normalizedOption === candidate) return Math.max(bestScore, 100)
        if (normalizedOption.startsWith(candidate) || candidate.startsWith(normalizedOption)) {
          return Math.max(bestScore, 70)
        }
        if (normalizedOption.includes(candidate) || candidate.includes(normalizedOption)) {
          return Math.max(bestScore, 40)
        }
        return bestScore
      }, 0)

      return {
        option,
        score,
      }
    })
    .sort((left, right) => right.score - left.score)[0]

  return rankedMatch?.score ? rankedMatch.option : undefined
}

function getFirstText(candidates: Array<string | undefined | null>) {
  return (
    candidates.find((candidate) => typeof candidate === "string" && candidate.trim())?.trim() || ""
  )
}

async function getDivisionOptions(provinceOptions?: DivisionOption[]): Promise<DivisionOption[]> {
  if (provinceOptions && provinceOptions.length > 0) {
    return provinceOptions
  }

  const provincesResult = await locationService.getProvinces()
  return provincesResult.kind === "ok" ? provincesResult.data : []
}

export function getCachedReportLocationPrefill() {
  return load<ReportLocationPrefill>(REPORT_LOCATION_PREFILL_KEY)
}

export async function buildReportLocationPrefill(
  provinceOptions?: DivisionOption[],
): Promise<ReportLocationPrefill | null> {
  const position = await getFastDeviceLocation()
  if (!position) return null

  const geocoded = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  })
  const currentAddress = geocoded[0]

  if (!currentAddress) {
    return null
  }

  const provinces = await getDivisionOptions(provinceOptions)
  const matchedProvince = findOptionByCandidates(provinces, [
    currentAddress.region,
    currentAddress.city,
    currentAddress.subregion,
  ])

  const districtResult = matchedProvince
    ? await locationService.getDistrictsByProvince(matchedProvince.code)
    : null
  const districtOptions = districtResult?.kind === "ok" ? districtResult.data : []
  const matchedDistrict = findOptionByCandidates(districtOptions, [
    currentAddress.subregion,
    currentAddress.district,
    currentAddress.city,
  ])

  const wardResult = matchedDistrict
    ? await locationService.getWardsByDistrict(matchedDistrict.code)
    : null
  const wardOptions = wardResult?.kind === "ok" ? wardResult.data : []
  const matchedWard = findOptionByCandidates(wardOptions, [
    currentAddress.district,
    currentAddress.name,
    currentAddress.street,
  ])

  const addressLine = [currentAddress.streetNumber, currentAddress.street, currentAddress.name]
    .filter((part): part is string => Boolean(part && typeof part === "string" && part.trim()))
    .join(" ")

  const prefill: ReportLocationPrefill = {
    province: matchedProvince?.name || getFirstText([currentAddress.region, currentAddress.city]),
    district: matchedDistrict?.name || getFirstText([currentAddress.subregion]),
    ward: matchedWard?.name || getFirstText([currentAddress.district]),
    addressLine,
    selectedProvinceCode: matchedProvince?.code ?? null,
    selectedDistrictCode: matchedDistrict?.code ?? null,
    selectedWardCode: matchedWard?.code ?? null,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    updatedAt: new Date().toISOString(),
  }

  save(REPORT_LOCATION_PREFILL_KEY, prefill)
  return prefill
}

export async function requestAndWarmReportLocationPrefill(
  provinceOptions?: DivisionOption[],
): Promise<WarmReportLocationPrefillResult> {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (permission.status !== "granted") {
    return {
      status: "denied",
      prefill: null,
    }
  }

  return {
    status: "granted",
    prefill: await buildReportLocationPrefill(provinceOptions),
  }
}
