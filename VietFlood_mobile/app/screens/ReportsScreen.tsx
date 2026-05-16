import {
  FC,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useDeferredValue,
  ComponentType,
} from "react"
import {
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  Modal,
  ScrollView,
  Pressable,
  Image,
  ImageStyle,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Skeleton } from "boneyard-js/native"
import {
  ArrowPathIcon,
  CheckIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  MapIcon,
  MapPinIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from "react-native-heroicons/outline"
import Animated from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { locationService } from "@/services/api/locationService"
import { reportService } from "@/services/api/reportService"
import {
  ReportCategory,
  type CreateReportRequest,
  type DivisionOption,
  type ImageAsset,
} from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import { createFadeInDown, createFadeInUp, softLayoutTransition } from "@/theme/motionPresets"
import type { ThemedStyle } from "@/theme/types"
import {
  getCachedReportLocationPrefill,
  requestAndWarmReportLocationPrefill,
  type ReportLocationPrefill,
} from "@/utils/reportLocationPrefill"
import { appToast } from "@/utils/toast"

interface ReportsScreenProps extends AppStackScreenProps<"Reports"> {}

type FormPickerType = "category" | "province" | "district" | "ward"

const CATEGORY_OPTIONS: { label: string; value: ReportCategory }[] = [
  { label: "Ngập lụt", value: ReportCategory.FLOOD },
  { label: "Sự cố", value: ReportCategory.INCIDENT },
  { label: "Hạ tầng", value: ReportCategory.INFRASTRUCTURE },
  { label: "Cứu hộ", value: ReportCategory.RESCUE },
]

const CATEGORY_ALIASES: Record<ReportCategory, string[]> = {
  [ReportCategory.FLOOD]: ["flood", "flooding", "ngap", "ngap lut"],
  [ReportCategory.INCIDENT]: ["incident", "issue", "su co"],
  [ReportCategory.INFRASTRUCTURE]: ["infrastructure", "ha tang"],
  [ReportCategory.RESCUE]: ["rescue", "emergency", "cuu ho"],
}

const REPORT_CATEGORY_KEYS = [
  "category",
  "categories",
  "category_name",
  "categoryName",
  "report_category",
  "reportCategory",
]
const REPORT_PROVINCE_KEYS = ["province", "province_name", "provinceName"]
const REPORT_DISTRICT_KEYS = ["district", "district_name", "districtName"]
const REPORT_WARD_KEYS = ["ward", "ward_name", "wardName"]
const REPORT_ADDRESS_KEYS = [
  "address_line",
  "addressLine",
  "address",
  "street_address",
  "streetAddress",
]

const CATEGORY_VALUE_KEYS = [
  "value",
  "category",
  "category_name",
  "categoryName",
  "name",
  "label",
  "title",
]

const LOOSE_TEXT_KEYS = [
  "name",
  "label",
  "value",
  "title",
  "category",
  "category_name",
  "categoryName",
  "address_line",
  "addressLine",
]

const normalizeLookupText = (value?: string | null) => {
  if (!value) return ""
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
}

const getLooseText = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number") return String(value).trim()
  if (Array.isArray(value)) return value.map(getLooseText).filter(Boolean).join(", ")

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of LOOSE_TEXT_KEYS) {
      const candidate = getLooseText(record[key])
      if (candidate) return candidate
    }
  }

  return ""
}

const getReportValue = (report: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = report[key]
    if (value === null || value === undefined) continue
    const textValue = getLooseText(value)
    if (textValue) return value
  }

  return undefined
}

const getReportText = (report: Record<string, unknown>, keys: string[]) => {
  const value = getReportValue(report, keys)
  return getLooseText(value)
}

const getReportCandidates = (report: Record<string, unknown>, keys: string[]) => {
  return keys.map((key) => getLooseText(report[key])).filter(Boolean)
}

const getCategoryParts = (value: unknown): string[] => {
  if (value === null || value === undefined) return []

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      return getCategoryParts(JSON.parse(trimmed))
    } catch {
      return trimmed
        .split(/[,;|]/)
        .map((part) => part.trim())
        .filter(Boolean)
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap(getCategoryParts)
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of CATEGORY_VALUE_KEYS) {
      const parts = getCategoryParts(record[key])
      if (parts.length > 0) return parts
    }
    return []
  }

  return [String(value).trim()].filter(Boolean)
}

type SelectByGpsOptions = {
  replaceAddressLine?: boolean
  provinceOptions?: DivisionOption[]
}

export const ReportsScreen: FC<ReportsScreenProps> = ({ route, navigation }) => {
  const { authRole, authUserId } = useAuth()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const canGoBack = navigation.canGoBack()

  // Use reportService to fetch reports
  const isAdmin = authRole === "admin" || authRole === "relief" || authRole === "coordinator"

  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add Create/Edit Report Form States
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingReportId, setEditingReportId] = useState<number | null>(null)

  const [categories, setCategories] = useState<ReportCategory[]>([])
  const [description, setDescription] = useState("")
  const [province, setProvince] = useState("")
  const [district, setDistrict] = useState("")
  const [ward, setWard] = useState("")
  const [addressLine, setAddressLine] = useState("")

  const [provinces, setProvinces] = useState<DivisionOption[]>([])
  const [districts, setDistricts] = useState<DivisionOption[]>([])
  const [wards, setWards] = useState<DivisionOption[]>([])

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(null)
  const [_selectedWardCode, setSelectedWardCode] = useState<number | null>(null)

  const [isProvincesLoading, setIsProvincesLoading] = useState(false)
  const [isDistrictsLoading, setIsDistrictsLoading] = useState(false)
  const [isWardsLoading, setIsWardsLoading] = useState(false)

  const [activePicker, setActivePicker] = useState<FormPickerType | null>(null)
  const [isSelectingByGps, setIsSelectingByGps] = useState(false)

  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory[]>([])
  const [provinceFilter, setProvinceFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "a-z" | "z-a">("newest")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const deferredUserSearchQuery = useDeferredValue(userSearchQuery)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const topBarInsetStyle = useMemo<ViewStyle>(
    () => ({
      paddingTop: insets.top > 0 ? 0 : 4,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }),
    [insets.left, insets.right, insets.top],
  )

  const fullAddressPreview = useMemo(() => {
    const parts = [addressLine, ward, district, province].filter((part) => Boolean(part?.trim()))
    return parts.length > 0 ? parts.join(", ") : "Chưa nhập địa chỉ"
  }, [addressLine, district, province, ward])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])

  const getCategoriesFromValue = useCallback((value?: unknown): ReportCategory[] => {
    const results: ReportCategory[] = []

    getCategoryParts(value).forEach((part) => {
      const normalizedPart = normalizeLookupText(part)
      const matchedOption = CATEGORY_OPTIONS.find((option) => {
        const normalizedLabel = normalizeLookupText(option.label)
        const aliases = CATEGORY_ALIASES[option.value]

        return (
          normalizedPart === option.value ||
          normalizedPart === normalizedLabel ||
          aliases.some((alias) => normalizedPart === alias || normalizedPart.includes(alias))
        )
      })

      if (matchedOption && !results.includes(matchedOption.value)) {
        results.push(matchedOption.value)
      }
    })

    return results
  }, [])

  const isUncategorized = useCallback(
    (value?: unknown) => getCategoriesFromValue(value).length === 0,
    [getCategoriesFromValue],
  )

  const getCategoryAccent = useCallback(
    (value: ReportCategory) => {
      switch (value) {
        case ReportCategory.FLOOD:
          return colors.tint
        case ReportCategory.INCIDENT:
          return colors.warning
        case ReportCategory.INFRASTRUCTURE:
          return colors.success
        case ReportCategory.RESCUE:
          return colors.error
        default:
          return colors.tint
      }
    },
    [colors.error, colors.success, colors.tint, colors.warning],
  )

  const getCategoryLabel = useCallback(
    (value: ReportCategory) =>
      CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value,
    [],
  )

  const renderCategoryIcon = useCallback((value: ReportCategory, color: string) => {
    switch (value) {
      case ReportCategory.FLOOD:
        return <MapPinIcon size={16} color={color} />
      case ReportCategory.INCIDENT:
        return <ExclamationCircleIcon size={16} color={color} />
      case ReportCategory.INFRASTRUCTURE:
        return <CheckBadgeIcon size={16} color={color} />
      case ReportCategory.RESCUE:
        return <SparklesIcon size={16} color={color} />
      default:
        return <DocumentTextIcon size={16} color={color} />
    }
  }, [])

  const toggleCategory = useCallback((value: ReportCategory) => {
    setCategories((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value)
      }

      return [...prev, value]
    })
  }, [])

  const formatReportDate = useCallback((value?: string) => {
    if (!value) return ""
    const safeValue = value.replace(" ", "T")
    const parsed = new Date(safeValue)
    if (Number.isNaN(parsed.getTime())) return ""
    return parsed.toLocaleDateString("vi-VN")
  }, [])

  const getEvidencePreview = useCallback((images?: string[]) => {
    return {
      visible: images?.slice(0, 3) ?? [],
      moreCount: Math.max(0, (images?.length ?? 0) - 3),
    }
  }, [])

  const normalizeName = useCallback((value?: string | null) => {
    return normalizeLookupText(value)
  }, [])

  const applyFilters = useCallback(
    (report: any) => {
      // Check status filter
      if (statusFilter.length > 0 && !statusFilter.includes(report.status)) return false
      // Check category filter
      if (categoryFilter.length > 0) {
        const reportCats = getCategoriesFromValue(report.category)
        const isUncat = reportCats.length === 0

        // If we are filtering by something and this report is uncategorized,
        // it only matches if we explicitly filter for '' (empty string placeholder for Uncategorized)
        // Since categoryFilter uses ReportCategory enum, we might need a workaround for "Uncategorized"
        // Wait, let's treat "uncategorized" as a pseudo-category "uncategorized" in the filter array
        if (isUncat) {
          if (!categoryFilter.includes("uncategorized" as any)) return false
        } else {
          if (!reportCats.some((cat) => categoryFilter.includes(cat))) return false
        }
      }
      // Check province filter
      if (provinceFilter.length > 0 && report.province && !provinceFilter.includes(report.province))
        return false
      return true
    },
    [statusFilter, categoryFilter, provinceFilter, getCategoriesFromValue],
  )

  const clearFilters = useCallback(() => {
    setStatusFilter([])
    setCategoryFilter([])
    setProvinceFilter([])
  }, [])

  const filteredReports = useMemo(() => {
    let result = reports.filter(applyFilters)
    const normalizedSearch = deferredUserSearchQuery.trim().toLowerCase()

    if (normalizedSearch) {
      result = result.filter((report) =>
        [
          report.description,
          report.address_line,
          report.addressLine,
          report.province,
          report.district,
          report.ward,
          report.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      )
    }

    switch (sortOrder) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case "a-z":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        break
      case "z-a":
        result.sort((a, b) => (b.title || "").localeCompare(a.title || ""))
        break
    }

    return result
  }, [reports, applyFilters, sortOrder, deferredUserSearchQuery])

  const availableProvinces = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((report) => report.province)
          .filter((value): value is string => Boolean(value && value.trim())),
      ),
    ).sort((left, right) => left.localeCompare(right))
  }, [reports])

  const findOptionByCandidates = useCallback(
    (options: DivisionOption[], candidates: Array<string | undefined | null>) => {
      const normalizedCandidates = candidates.map((item) => normalizeName(item)).filter(Boolean)
      if (normalizedCandidates.length === 0) return undefined

      const exactMatch = options.find((option) =>
        normalizedCandidates.includes(normalizeName(option.name)),
      )
      if (exactMatch) return exactMatch

      return options.find((option) => {
        const normalizedOption = normalizeName(option.name)
        return normalizedCandidates.some(
          (candidate) =>
            normalizedOption.includes(candidate) || candidate.includes(normalizedOption),
        )
      })
    },
    [normalizeName],
  )

  const loadProvinces = useCallback(async (): Promise<DivisionOption[]> => {
    setIsProvincesLoading(true)
    try {
      const result = await locationService.getProvinces()
      if (result.kind === "ok") {
        setProvinces(result.data)
        return result.data
      }
      appToast.error({
        title: "Lỗi",
        description: "Không tải được danh sách tỉnh/thành phố.",
      })
      return []
    } finally {
      setIsProvincesLoading(false)
    }
  }, [])

  const loadDistricts = useCallback(async (provinceCode: number): Promise<DivisionOption[]> => {
    setIsDistrictsLoading(true)
    try {
      const result = await locationService.getDistrictsByProvince(provinceCode)
      if (result.kind === "ok") {
        setDistricts(result.data)
        return result.data
      }
      appToast.error({
        title: "Lỗi",
        description: "Không tải được danh sách quận/huyện.",
      })
      return []
    } finally {
      setIsDistrictsLoading(false)
    }
  }, [])

  const loadWards = useCallback(async (districtCode: number): Promise<DivisionOption[]> => {
    setIsWardsLoading(true)
    try {
      const result = await locationService.getWardsByDistrict(districtCode)
      if (result.kind === "ok") {
        setWards(result.data)
        return result.data
      }
      appToast.error({
        title: "Lỗi",
        description: "Không tải được danh sách phường/xã.",
      })
      return []
    } finally {
      setIsWardsLoading(false)
    }
  }, [])

  const getPickerOptions = () => {
    if (activePicker === "category") {
      return CATEGORY_OPTIONS.map((item) => ({
        key: item.value,
        label: item.label,
        value: item.value,
        toneColor: getCategoryAccent(item.value),
      }))
    }

    if (activePicker === "province") {
      return provinces.map((item) => ({
        key: item.code,
        label: item.name,
        code: item.code,
        toneColor: colors.tint,
      }))
    }

    if (activePicker === "district") {
      return districts.map((item) => ({
        key: item.code,
        label: item.name,
        code: item.code,
        toneColor: colors.info,
      }))
    }

    return wards.map((item) => ({
      key: item.code,
      label: item.name,
      code: item.code,
      toneColor: colors.success,
    }))
  }

  const getPickerTitle = () => {
    if (activePicker === "category") return "Chọn danh mục"
    if (activePicker === "province") return "Chọn tỉnh/thành phố"
    if (activePicker === "district") return "Chọn quận/huyện"
    return "Chọn phường/xã"
  }

  const isPickerLoading = () => {
    if (activePicker === "category") return false
    if (activePicker === "province") return isProvincesLoading
    if (activePicker === "district") return isDistrictsLoading
    return isWardsLoading
  }

  const handlePickerSelect = (option: {
    key: string | number
    label: string
    value?: ReportCategory
    code?: number
  }) => {
    if (activePicker === "category" && "value" in option && option.value) {
      const optValue = option.value as ReportCategory
      setCategories((prev) => {
        if (prev.includes(optValue)) {
          return prev.filter((c) => c !== optValue)
        } else {
          return [...prev, optValue]
        }
      })
      return
    }

    if (activePicker === "province" && option.code) {
      setSelectedProvinceCode(option.code)
      setProvince(option.label)
      setSelectedDistrictCode(null)
      setDistrict("")
      setDistricts([])
      setSelectedWardCode(null)
      setWard("")
      setWards([])
      setActivePicker(null)
      void loadDistricts(option.code)
      return
    }

    if (activePicker === "district" && option.code) {
      setSelectedDistrictCode(option.code)
      setDistrict(option.label)
      setSelectedWardCode(null)
      setWard("")
      setWards([])
      setActivePicker(null)
      void loadWards(option.code)
      return
    }

    if (option.code) {
      setSelectedWardCode(option.code)
      setWard(option.label)
      setActivePicker(null)
    }
  }

  const applyLocationPrefill = useCallback(
    (prefill: ReportLocationPrefill, options?: { replaceAddressLine?: boolean }) => {
      setProvince(prefill.province)
      setDistrict(prefill.district)
      setWard(prefill.ward)
      setSelectedProvinceCode(prefill.selectedProvinceCode)
      setSelectedDistrictCode(prefill.selectedDistrictCode)
      setSelectedWardCode(prefill.selectedWardCode)

      if (options?.replaceAddressLine || !addressLine.trim()) {
        setAddressLine(prefill.addressLine)
      }
    },
    [addressLine],
  )

  const hydratePrefillSelections = useCallback(
    async (prefill: ReportLocationPrefill) => {
      if (!prefill.selectedProvinceCode) {
        setDistricts([])
        setWards([])
        return
      }

      const districtOptions = await loadDistricts(prefill.selectedProvinceCode)

      if (!prefill.selectedDistrictCode) {
        setWards([])
        return
      }

      const hasDistrict = districtOptions.some(
        (option) => option.code === prefill.selectedDistrictCode,
      )
      if (!hasDistrict) {
        setWards([])
        return
      }

      const wardOptions = await loadWards(prefill.selectedDistrictCode)
      if (!prefill.selectedWardCode) return

      const hasWard = wardOptions.some((option) => option.code === prefill.selectedWardCode)
      if (!hasWard) {
        setSelectedWardCode(null)
      }
    },
    [loadDistricts, loadWards],
  )

  const handleSelectByGps = useCallback(
    async (options?: SelectByGpsOptions) => {
      try {
        setIsSelectingByGps(true)

        const result = await requestAndWarmReportLocationPrefill(options?.provinceOptions)
        if (result.status !== "granted") {
          appToast.warning({
            title: "Cần cấp quyền",
            description: "Vui lòng cho phép truy cập vị trí để tự động điền địa chỉ.",
          })
          return
        }

        if (!result.prefill) {
          appToast.info({
            title: "Không khả dụng",
            description: "Không thể xác định thông tin vị trí của bạn.",
          })
          return
        }

        applyLocationPrefill(result.prefill, { replaceAddressLine: options?.replaceAddressLine })
        await hydratePrefillSelections(result.prefill)
      } catch (e: any) {
        console.log("GPS Location error:", e)
        appToast.error({
          title: "Lỗi",
          description: `Không thể sử dụng vị trí GPS (${e?.message || "không rõ"}). Hãy đảm bảo dịch vụ định vị đã được bật trên thiết bị và thử lại.`,
        })
      } finally {
        setIsSelectingByGps(false)
      }
    },
    [applyLocationPrefill, hydratePrefillSelections],
  )

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (isAdmin) {
        const result = await reportService.getAllReports()
        if (result.kind === "ok") {
          setReports(result.data.reports || [])
          setLastSyncedAt(new Date())
        } else if (result.kind === "forbidden") {
          setError("Bạn không có quyền xem tất cả báo cáo. Vui lòng liên hệ quản trị viên.")
        } else {
          setError("Không tải được danh sách báo cáo.")
        }
      } else {
        // For regular users: try to fetch reports
        const result = await reportService.getUserReports()
        if (result.kind === "ok") {
          setReports(result.data || [])
          setLastSyncedAt(new Date())
        } else if (result.kind === "forbidden") {
          // Backend has incorrect role restriction - allow viewing empty feed
          console.warn(
            "[Reports] 403 Forbidden on /reports/user - backend has incorrect role guard",
          )
          setReports([])
          setError(null) // Don't show error, let user create reports
        } else {
          setError("Không tải được danh sách báo cáo.")
        }
      }
    } catch {
      setError("Đã xảy ra lỗi khi tải báo cáo.")
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  const openReliefReport = useCallback(
    (report: any) => {
      navigation.navigate("ReliefReportDetailScreen", {
        reportId: String(report.id),
        report,
      })
    },
    [navigation],
  )

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  useEffect(() => {
    if (route.params?.openCreateModal) {
      void openCreateModal()
      navigation.setParams({ openCreateModal: undefined })
    }
  }, [navigation, route.params?.openCreateModal])

  // Check if a report can be edited (e.g. within 24 hours of creation)
  const isEditable = (createdAtRaw: string | undefined | null) => {
    if (!createdAtRaw) return false
    // Replace space with T to handle non-ISO dates safely across platforms
    const safeStr = createdAtRaw.replace(" ", "T")
    const createdAt = new Date(safeStr).getTime()

    // Fallback in case of parsing issue (e.g. invalid date string)
    if (isNaN(createdAt)) return false

    const now = new Date().getTime()
    // It's possible server time is slightly ahead, so use Math.max to prevent negative time
    const diffHours = Math.max(0, now - createdAt) / (1000 * 60 * 60)
    return diffHours <= 24
  }

  const openCreateModal = useCallback(async () => {
    setFormMode("create")
    setEditingReportId(null)
    setCategories([])
    setDescription("")
    setProvince("")
    setSelectedProvinceCode(null)
    setDistrict("")
    setSelectedDistrictCode(null)
    setDistricts([])
    setWard("")
    setSelectedWardCode(null)
    setWards([])
    setAddressLine("")
    setSelectedImages([])
    setExistingImages([])
    setActivePicker(null)
    setIsModalVisible(true)
    const provinceOptions = provinces.length > 0 ? provinces : await loadProvinces()
    const cachedPrefill = getCachedReportLocationPrefill()

    if (cachedPrefill) {
      applyLocationPrefill(cachedPrefill, { replaceAddressLine: true })
      await hydratePrefillSelections(cachedPrefill)
    }

    void handleSelectByGps({ replaceAddressLine: true, provinceOptions })
  }, [applyLocationPrefill, handleSelectByGps, hydratePrefillSelections, loadProvinces, provinces])

  const openEditModal = async (report: any) => {
    const reportDate = report.created_at || report.createdAt
    if (!isEditable(reportDate)) {
      appToast.warning({
        title: "Quá thời hạn chỉnh sửa",
        description: "Bạn chỉ có thể chỉnh sửa báo cáo trong vòng 24 giờ kể từ lúc tạo.",
      })
      return
    }

    const reportRecord = report as Record<string, unknown>
    const reportCategory = getReportValue(reportRecord, REPORT_CATEGORY_KEYS)
    const reportProvince = getReportText(reportRecord, REPORT_PROVINCE_KEYS)
    const reportDistrict = getReportText(reportRecord, REPORT_DISTRICT_KEYS)
    const reportWard = getReportText(reportRecord, REPORT_WARD_KEYS)
    const reportAddressLine = getReportText(reportRecord, REPORT_ADDRESS_KEYS)

    // Set form values first
    setFormMode("edit")
    setEditingReportId(report.id)
    setCategories(getCategoriesFromValue(reportCategory))
    setDescription(report.description || "")
    setProvince(reportProvince)
    setDistrict(reportDistrict)
    setWard(reportWard)
    setAddressLine(reportAddressLine)
    setSelectedImages([])
    setExistingImages(report.images || [])
    setSelectedProvinceCode(null)
    setSelectedDistrictCode(null)
    setSelectedWardCode(null)
    setDistricts([])
    setWards([])
    setActivePicker(null)

    // Load location data before opening modal
    const provinceOptions = provinces.length > 0 ? provinces : await loadProvinces()
    const matchedProvince = findOptionByCandidates(
      provinceOptions,
      getReportCandidates(reportRecord, REPORT_PROVINCE_KEYS),
    )

    if (matchedProvince) {
      setSelectedProvinceCode(matchedProvince.code)
      setProvince(matchedProvince.name)

      const districtOptions = await loadDistricts(matchedProvince.code)
      const matchedDistrict = findOptionByCandidates(
        districtOptions,
        getReportCandidates(reportRecord, REPORT_DISTRICT_KEYS),
      )

      if (matchedDistrict) {
        setSelectedDistrictCode(matchedDistrict.code)
        setDistrict(matchedDistrict.name)

        const wardOptions = await loadWards(matchedDistrict.code)
        const matchedWard = findOptionByCandidates(
          wardOptions,
          getReportCandidates(reportRecord, REPORT_WARD_KEYS),
        )

        if (matchedWard) {
          setSelectedWardCode(matchedWard.code)
          setWard(matchedWard.name)
        }
      }
    }

    // Now open the modal with all data loaded
    setIsModalVisible(true)
  }

  const handlePickEvidence = async () => {
    const totalCurrentCount = selectedImages.length + existingImages.length
    if (totalCurrentCount >= 5) {
      appToast.warning({
        title: "Đã đạt giới hạn",
        description: "Bạn chỉ có thể thêm tối đa 5 ảnh.",
      })
      return
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (permission.status !== "granted") {
      appToast.warning({
        title: "Cần cấp quyền",
        description: "Vui lòng cho phép truy cập thư viện ảnh để thêm minh chứng.",
      })
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - totalCurrentCount,
    })

    if (!result.canceled && result.assets.length > 0) {
      const newImages: ImageAsset[] = result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      }))
      setSelectedImages((prev) => {
        const combined = [...prev, ...newImages]
        return combined.slice(0, 5 - existingImages.length)
      })
    }
  }

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (categories.length === 0 || !description || !province || !addressLine) {
      appToast.warning({
        title: "Thiếu thông tin",
        description:
          "Vui lòng chọn ít nhất một danh mục và điền đầy đủ mô tả, tỉnh/thành phố và địa chỉ.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (formMode === "create") {
        const result = await reportService.createReport({
          category: categories,
          description,
          province,
          district: district || undefined,
          ward: ward || undefined,
          addressLine,
          userId: authUserId || 1,
          images: selectedImages.length > 0 ? selectedImages : undefined,
        } as CreateReportRequest)

        if (result.kind === "ok") {
          appToast.success({
            title: "Thành công",
            description: "Đã tạo báo cáo thành công.",
          })
          setIsModalVisible(false)
          fetchReports()
        } else {
          appToast.error({
            title: "Lỗi",
            description: "Không thể tạo báo cáo.",
          })
        }
      } else if (formMode === "edit" && editingReportId) {
        const result = await reportService.updateReport(editingReportId, {
          category: categories,
          description,
          province,
          district: district || undefined,
          ward: ward || undefined,
          addressLine,
          images: selectedImages.length > 0 ? selectedImages : undefined,
          existing_images: existingImages,
        })

        if (result.kind === "ok") {
          appToast.success({
            title: "Thành công",
            description: "Đã cập nhật báo cáo thành công.",
          })
          setIsModalVisible(false)
          fetchReports()
        } else {
          appToast.error({
            title: "Lỗi",
            description: "Không thể cập nhật báo cáo.",
          })
        }
      }
    } catch {
      appToast.error({
        title: "Lỗi",
        description: "Đã có sự cố xảy ra.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.success // green
      case "in_progress":
      case "in-progress":
      case "verified":
        return colors.warning // amber
      case "pending":
        return colors.palette.neutral500
      case "resolved":
        return colors.success
      case "rejected":
        return colors.error // red
      default:
        return colors.textDim
    }
  }

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return "Chờ xác minh"
      case "verified":
        return "Đã xác minh"
      case "in-progress":
      case "in_progress":
        return "Đang xử lý"
      case "resolved":
      case "completed":
        return "Đã xử lý"
      case "rejected":
        return "Cần cập nhật"
      default:
        return String(status).replace(/_/g, " ")
    }
  }, [])

  const getStatusHint = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return "Yêu cầu của bạn đang chờ đội phản ứng xem xét."
      case "verified":
        return "Báo cáo của bạn đã được xác minh và sẵn sàng để lập kế hoạch ứng phó."
      case "in-progress":
      case "in_progress":
        return "Lực lượng ứng phó đang xử lý báo cáo này."
      case "resolved":
      case "completed":
        return "Sự việc này đã được đánh dấu đã xử lý."
      case "rejected":
        return "Vui lòng xem lại chi tiết và cập nhật báo cáo nếu cần."
      default:
        return "Theo dõi trạng thái của báo cáo tại đây."
    }
  }, [])

  const getCategorySummary = useCallback(
    (value?: unknown) => {
      if (isUncategorized(value)) return "Chưa phân loại"

      return getCategoriesFromValue(value)
        .map((item) => getCategoryLabel(item))
        .join(", ")
    },
    [getCategoriesFromValue, getCategoryLabel, isUncategorized],
  )

  const formatSyncTime = useCallback((value: Date | null) => {
    if (!value) return "Chưa đồng bộ"

    return value.toLocaleTimeString("vi-VN", {
      hour: "numeric",
      minute: "2-digit",
    })
  }, [])

  const formatEditWindowHint = useCallback((report: any) => {
    const reportDate = report.created_at || report.createdAt
    if (!reportDate) return "Không xác định được thời hạn chỉnh sửa"
    if (!isEditable(reportDate)) return "Đã hết thời gian chỉnh sửa"

    const safeDate = String(reportDate).replace(" ", "T")
    const createdAt = new Date(safeDate).getTime()
    if (Number.isNaN(createdAt)) return "Có thể chỉnh sửa trong 24 giờ sau khi gửi"

    const remainingHours = Math.max(0, 24 - (Date.now() - createdAt) / (1000 * 60 * 60))
    if (remainingHours < 1) return "Còn dưới 1 giờ để chỉnh sửa"
    return `Còn ${Math.ceil(remainingHours)} giờ để chỉnh sửa`
  }, [])

  const hasActiveFilters = useMemo(
    () =>
      statusFilter.length > 0 ||
      categoryFilter.length > 0 ||
      provinceFilter.length > 0 ||
      sortOrder !== "newest" ||
      userSearchQuery.trim().length > 0,
    [categoryFilter.length, provinceFilter.length, sortOrder, statusFilter.length, userSearchQuery],
  )

  const totalEvidenceCount = selectedImages.length + existingImages.length
  const hasDescription = description.trim().length > 0
  const hasLocationReady = Boolean(province.trim() && addressLine.trim())
  const isReportDraftReady = categories.length > 0 && hasDescription && hasLocationReady

  const reportComposerSteps = useMemo(
    () => [
      {
        key: "details",
        label: "Chi tiết",
        value: categories.length > 0 ? `${categories.length} mục` : "Chọn mục",
        complete: categories.length > 0 && hasDescription,
      },
      {
        key: "location",
        label: "Vị trí",
        value: ward || district || province || "Thêm vị trí",
        complete: hasLocationReady,
      },
      {
        key: "evidence",
        label: "Ảnh",
        value: totalEvidenceCount > 0 ? `${totalEvidenceCount}/5 ảnh` : "Tùy chọn",
        complete: totalEvidenceCount > 0,
      },
    ],
    [
      categories.length,
      district,
      hasDescription,
      hasLocationReady,
      province,
      totalEvidenceCount,
      ward,
    ],
  )

  const pickerOptions = useMemo(
    () => getPickerOptions(),
    [
      activePicker,
      colors.info,
      colors.success,
      colors.tint,
      districts,
      getCategoryAccent,
      provinces,
      wards,
    ],
  )

  const pickerDescription = useMemo(() => {
    if (activePicker === "category") return "Chọn một hoặc nhiều danh mục cho báo cáo này."
    if (activePicker === "province") return "Chọn tỉnh/thành phố nơi sự việc xảy ra."
    if (activePicker === "district") return "Chọn quận/huyện trong tỉnh/thành phố đã chọn."
    if (activePicker === "ward") return "Chọn phường/xã gần nơi xảy ra sự việc nhất."
    return ""
  }, [activePicker])

  const userSummary = useMemo(() => {
    return {
      total: reports.length,
      awaiting: reports.filter((report) => ["pending", "verified"].includes(report.status)).length,
      resolved: reports.filter((report) => ["resolved", "completed"].includes(report.status))
        .length,
      editable: reports.filter((report) => {
        const reportDate = report.created_at || report.createdAt
        return (
          report.status !== "resolved" && report.status !== "completed" && isEditable(reportDate)
        )
      }).length,
      rejected: reports.filter((report) => report.status === "rejected").length,
    }
  }, [reports])

  const userPriorityReport = useMemo(() => {
    return (
      filteredReports.find((report) =>
        ["pending", "verified", "rejected"].includes(report.status),
      ) ||
      filteredReports[0] ||
      null
    )
  }, [filteredReports])

  const SearchLeftAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function SearchLeftAccessoryComponent(props: TextFieldAccessoryProps) {
        return (
          <View style={[themed($reportSearchAccessory), props.style as ViewStyle]}>
            <DocumentTextIcon color={colors.textDim} size={16} />
          </View>
        )
      },
    [colors.textDim, themed],
  )

  const renderFilterPanel = () => (
    <Animated.View
      entering={createFadeInUp(0, 50)}
      layout={softLayoutTransition}
      style={themed(isAdmin ? $filterPanel : $residentFilterPanel)}
    >
      <View style={$filterHeader}>
        <Text text="Lọc báo cáo" preset="bold" />
        {hasActiveFilters && (
          <Pressable
            onPress={() => {
              clearFilters()
              setSortOrder("newest")
              setUserSearchQuery("")
            }}
          >
            <Text text="Xóa hết" size="xs" style={{ color: colors.error }} />
          </Pressable>
        )}
      </View>

      <Text text="Trạng thái" size="xs" style={themed($filterLabel)} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={$filterRow}
      >
        {["pending", "verified", "rejected", "resolved"].map((status) => {
          const isSelected = statusFilter.includes(status)
          return (
            <Pressable
              key={status}
              style={[themed($filterChip), isSelected && themed($filterChipSelected)]}
              onPress={() => {
                setStatusFilter((prev) =>
                  isSelected ? prev.filter((item) => item !== status) : [...prev, status],
                )
              }}
            >
              <Text
                text={getStatusLabel(status)}
                size="xs"
                style={{ color: isSelected ? colors.tint : colors.textDim }}
              />
            </Pressable>
          )
        })}
      </ScrollView>

      <Text text="Danh mục" size="xs" style={themed($filterLabel)} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={$filterRow}
      >
        {[...CATEGORY_OPTIONS, { label: "Chưa phân loại", value: "uncategorized" as any }].map(
          (item) => {
            const isSelected = categoryFilter.includes(item.value)
            return (
              <Pressable
                key={item.value}
                style={[themed($filterChip), isSelected && themed($filterChipSelected)]}
                onPress={() => {
                  setCategoryFilter((prev) =>
                    isSelected
                      ? prev.filter((category) => category !== item.value)
                      : [...prev, item.value],
                  )
                }}
              >
                <Text
                  text={item.label}
                  size="xs"
                  style={{ color: isSelected ? colors.tint : colors.textDim }}
                />
              </Pressable>
            )
          },
        )}
      </ScrollView>

      {availableProvinces.length > 0 && (
        <>
          <Text text="Tỉnh/thành phố" size="xs" style={themed($filterLabel)} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$filterRow}
          >
            {availableProvinces.map((provinceName) => {
              const isSelected = provinceFilter.includes(provinceName)
              return (
                <Pressable
                  key={provinceName}
                  style={[themed($filterChip), isSelected && themed($filterChipSelected)]}
                  onPress={() => {
                    setProvinceFilter((prev) =>
                      isSelected
                        ? prev.filter((provinceItem) => provinceItem !== provinceName)
                        : [...prev, provinceName],
                    )
                  }}
                >
                  <Text
                    text={provinceName}
                    size="xs"
                    style={{ color: isSelected ? colors.tint : colors.textDim }}
                  />
                </Pressable>
              )
            })}
          </ScrollView>
        </>
      )}

      <Text text="Sắp xếp theo" size="xs" style={themed($filterLabel)} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={$filterRow}
      >
        {[
          { label: "Mới nhất trước", value: "newest" },
          { label: "Cũ nhất trước", value: "oldest" },
          { label: "A - Z (mô tả)", value: "a-z" },
          { label: "Z - A (mô tả)", value: "z-a" },
        ].map((option) => {
          const isSelected = sortOrder === option.value
          return (
            <Pressable
              key={option.value}
              style={[themed($filterChip), isSelected && themed($filterChipSelected)]}
              onPress={() => setSortOrder(option.value as "newest" | "oldest" | "a-z" | "z-a")}
            >
              <Text
                text={option.label}
                size="xs"
                style={{ color: isSelected ? colors.tint : colors.textDim }}
              />
            </Pressable>
          )
        })}
      </ScrollView>
    </Animated.View>
  )

  return (
    <Screen preset="scroll" contentContainerStyle={themed($container)}>
      {/* Back button — only rendered when there is navigation history */}
      {canGoBack && (
        <View style={[themed($topBar), topBarInsetStyle]}>
          <Button variant="ghost" onPress={() => navigation.goBack()} style={themed($backButton)}>
            <View style={themed($backButtonContent)}>
              <ChevronLeftIcon size={20} color={colors.text} />
              <Text text="Quay lại" preset="bold" style={{ color: colors.text }} />
            </View>
          </Button>
        </View>
      )}

      {/* Loading state */}
      {isLoading && (
        <View style={themed($loadingContainer)}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <View key={idx} style={[themed($reportItem), $skeletonMargin]}>
              <Skeleton name="report-card" loading={true}>
                <View style={themed($reportHeader)}>
                  <Text
                    text="Đang tải tiêu đề báo cáo"
                    preset="bold"
                    numberOfLines={2}
                    style={$reportTitle}
                  />
                  <Text
                    text="Chờ xác minh"
                    size="xs"
                    style={[{ color: getStatusColor("pending") }, $reportStatus]}
                  />
                </View>
                <Text
                  text="Mô tả ngắn để khung tải giữ đúng kích thước."
                  size="sm"
                  numberOfLines={2}
                />
                <Text size="xs" text={`Tạo lúc: 01/01/2026`} style={themed($reportMeta)} />
              </Skeleton>
            </View>
          ))}
        </View>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <Animated.View entering={createFadeInUp(0)} style={themed($errorContainer)}>
          <View style={themed($errorBox)}>
            <Text preset="bold" text="Không tải được báo cáo" style={themed($errorTitle)} />
            <Text text={error} size="sm" style={themed($errorMessage)} />
            <Button
              variant="default"
              label="Thử lại"
              onPress={() => void fetchReports()}
              style={themed($retryButton)}
            />
          </View>
        </Animated.View>
      )}

      {/* Success state */}
      {!isLoading && !error && reports.length >= 0 && (
        <>
          {isAdmin ? (
            <>
              <Animated.View
                entering={createFadeInDown(0)}
                layout={softLayoutTransition}
                style={themed($heroCard)}
              >
                <View style={themed($heroHeaderRow)}>
                  <View style={themed($heroHeaderContent)}>
                    <Text preset="heading" text="Báo cáo sự cố" style={themed($heroTitle)} />
                    <Text
                      size="sm"
                      text="Bảng tin vận hành trên toàn hệ thống"
                      style={themed($heroSubtitle)}
                    />
                  </View>
                  <Button
                    variant="ghost"
                    onPress={() => setShowFilters(!showFilters)}
                    style={themed($heroFilterButton)}
                  >
                    <Text
                      text="Lọc"
                      preset="bold"
                      style={{ color: showFilters ? colors.tint : colors.textDim }}
                    />
                  </Button>
                </View>

                {showFilters && renderFilterPanel()}

                <View style={themed($heroMetaRow)}>
                  <View style={themed($heroCountPill)}>
                    <Text
                      size="xs"
                      text={`${filteredReports.length} báo cáo`}
                      style={themed($heroCountText)}
                    />
                  </View>
                </View>
              </Animated.View>

              {filteredReports.length > 0 ? (
                <Animated.View layout={softLayoutTransition} style={themed($reportsStack)}>
                  {filteredReports.map((report: any, index: number) => {
                    return (
                      <Animated.View
                        key={report.id}
                        entering={createFadeInUp(Math.min(index, 7))}
                        layout={softLayoutTransition}
                        style={themed($reportCard)}
                      >
                        <View style={themed($reportCardTopRow)}>
                          <View style={themed($cardContent)}>
                            <View style={themed($reportCategoryRow)}>
                              {isUncategorized(report.category) ? (
                                <View style={[themed($categoryPill), themed($uncategorizedBadge)]}>
                                  <Text
                                    text="Chưa phân loại"
                                    size="xs"
                                    preset="bold"
                                    style={[
                                      themed($categoryPillText),
                                      themed($uncategorizedBadgeText),
                                    ]}
                                  />
                                </View>
                              ) : (
                                getCategoriesFromValue(report.category).map((cat) => {
                                  const categoryAccent = getCategoryAccent(cat)
                                  return (
                                    <View
                                      key={cat}
                                      style={[
                                        themed($categoryPill),
                                        {
                                          borderColor: categoryAccent,
                                          backgroundColor: colors.background,
                                        },
                                      ]}
                                    >
                                      <Text
                                        text={
                                          CATEGORY_OPTIONS.find((item) => item.value === cat)
                                            ?.label ?? cat
                                        }
                                        size="xs"
                                        preset="bold"
                                        style={[
                                          themed($categoryPillText),
                                          { color: categoryAccent },
                                        ]}
                                      />
                                    </View>
                                  )
                                })
                              )}
                            </View>
                          </View>
                          <View
                            style={[
                              themed($statusPill),
                              { borderColor: getStatusColor(report.status) },
                            ]}
                          >
                            <Text
                              size="xs"
                              text={getStatusLabel(report.status)}
                              style={[
                                themed($statusPillText),
                                { color: getStatusColor(report.status) },
                              ]}
                            />
                          </View>
                        </View>

                        <Text
                          text={report.description}
                          preset="bold"
                          numberOfLines={2}
                          style={[themed($reportTitleModern), themed($reportTitleModernSpacing)]}
                        />

                        {report.images && report.images.length > 0 && (
                          <View style={themed($evidencePreviewSection)}>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={themed($evidencePreviewContainer)}
                            >
                              {getEvidencePreview(report.images).visible.map(
                                (imageUri: string, index: number) => {
                                  const isLast = index === 2
                                  const moreCount = getEvidencePreview(report.images).moreCount

                                  return (
                                    <View key={index} style={$evidenceThumbWrap}>
                                      <Image
                                        source={{ uri: imageUri }}
                                        style={$evidencePreviewThumb as ImageStyle}
                                      />
                                      {isLast && moreCount > 0 && (
                                        <View style={themed($evidenceMoreBadge)}>
                                          <Text
                                            text={`+${moreCount}`}
                                            size="xs"
                                            preset="bold"
                                            style={themed($evidenceMoreBadgeText)}
                                          />
                                        </View>
                                      )}
                                    </View>
                                  )
                                },
                              )}
                            </ScrollView>
                          </View>
                        )}

                        <Text
                          size="xs"
                          text={`${report.ward ? `${report.ward}, ` : ""}${report.district ? `${report.district}, ` : ""}${report.province}`}
                          style={themed($reportMetaModern)}
                        />

                        <View style={themed($reportFooterRow)}>
                          <Text
                            size="xs"
                            text={
                              formatReportDate(report.created_at || report.createdAt)
                                ? `Tạo lúc ${formatReportDate(report.created_at || report.createdAt)}`
                                : ""
                            }
                            style={themed($reportMetaModern)}
                          />
                          <Pressable onPress={() => openReliefReport(report)}>
                            <Text
                              size="xs"
                              text="Xem chi tiết"
                              style={[themed($reportActionText), { color: colors.tint }]}
                            />
                          </Pressable>
                        </View>
                      </Animated.View>
                    )
                  })}
                </Animated.View>
              ) : (
                <EmptyState
                  title="Chưa có báo cáo"
                  description="Hiện chưa có báo cáo nào trong bảng tin vận hành."
                />
              )}
            </>
          ) : (
            <>
              <Animated.View
                entering={createFadeInDown(0)}
                layout={softLayoutTransition}
                style={themed($residentHeroCard)}
              >
                <View style={themed($residentHeroAccent)} />
                <View style={themed($residentHeroHeader)}>
                  <Text
                    size="xxs"
                    text={`Đồng bộ ${formatSyncTime(lastSyncedAt)}`}
                    style={themed($residentSyncText)}
                  />
                </View>

                <Text
                  preset="heading"
                  text="Theo dõi báo cáo"
                  style={themed($residentHeroTitle)}
                />

                <View style={themed($residentActionRow)}>
                  <Button
                    variant="default"
                    onPress={openCreateModal}
                    style={themed($residentPrimaryButton)}
                  >
                    <View style={themed($residentPrimaryButtonContent)}>
                      <PlusIcon size={16} color={colors.palette.neutral100} />
                      <Text
                        text="Báo cáo mới"
                        size="xs"
                        preset="bold"
                        style={themed($residentPrimaryButtonText)}
                      />
                    </View>
                  </Button>
                  <Button
                    variant="outline"
                    label={showFilters ? "Ẩn bộ lọc" : "Lọc danh sách"}
                    onPress={() => setShowFilters(!showFilters)}
                    style={themed($residentSecondaryButton)}
                  />
                </View>

                {userPriorityReport && (
                  <View style={themed($residentHighlightCard)}>
                    <View style={themed($residentHighlightIcon)}>
                      {userPriorityReport.status === "rejected" ? (
                        <ExclamationCircleIcon size={18} color={colors.error} />
                      ) : userPriorityReport.status === "resolved" ? (
                        <CheckBadgeIcon size={18} color={colors.success} />
                      ) : (
                        <ClockIcon size={18} color={colors.warning} />
                      )}
                    </View>
                    <View style={themed($residentHighlightCopy)}>
                      <Text
                        size="xxxs"
                        text={
                          userPriorityReport.status === "rejected"
                            ? "Cần bạn xem lại"
                            : "Theo dõi cập nhật này"
                        }
                        style={themed($residentHighlightLabel)}
                      />
                      <Text
                        size="xs"
                        preset="bold"
                        text={userPriorityReport.description}
                        numberOfLines={1}
                        style={themed($residentHighlightTitle)}
                      />
                      <Text
                        size="xxs"
                        text={getStatusHint(userPriorityReport.status)}
                        numberOfLines={2}
                        style={themed($residentHighlightHint)}
                      />
                    </View>
                  </View>
                )}
              </Animated.View>

              <Animated.View
                entering={createFadeInUp(1)}
                layout={softLayoutTransition}
                style={themed($residentSummaryGrid)}
              >
                {[
                  {
                    key: "total",
                    label: "Tổng",
                    value: userSummary.total,
                    toneColor: colors.tint,
                    icon: <DocumentTextIcon size={18} color={colors.tint} />,
                  },
                  {
                    key: "awaiting",
                    label: "Chờ xử lý",
                    value: userSummary.awaiting,
                    toneColor: colors.warning,
                    icon: <ClockIcon size={18} color={colors.warning} />,
                  },
                  {
                    key: "editable",
                    label: "Có thể sửa",
                    value: userSummary.editable,
                    toneColor: colors.info,
                    icon: <SparklesIcon size={18} color={colors.info} />,
                  },
                  {
                    key: "resolved",
                    label: "Đã xử lý",
                    value: userSummary.resolved,
                    toneColor: colors.success,
                    icon: <CheckBadgeIcon size={18} color={colors.success} />,
                  },
                ].map((item, index) => (
                  <Animated.View
                    key={item.key}
                    entering={createFadeInUp(index + 2)}
                    layout={softLayoutTransition}
                    style={themed($residentSummaryCard)}
                  >
                    <View style={themed($residentSummaryTopRow)}>
                      <View
                        style={[
                          themed($residentSummaryIconWrap),
                          { backgroundColor: `${item.toneColor}12` },
                        ]}
                      >
                        {item.icon}
                      </View>
                      <Text
                        text={String(item.value)}
                        preset="heading"
                        style={themed($residentSummaryValue)}
                      />
                    </View>
                    <Text
                      text={item.label}
                      size="xxs"
                      preset="bold"
                      style={themed($residentSummaryLabel)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>

              <Animated.View
                entering={createFadeInUp(2)}
                layout={softLayoutTransition}
                style={themed($residentSearchCard)}
              >
                <Text
                  text="Tìm báo cáo nhanh"
                  size="xxs"
                  preset="bold"
                  style={themed($residentSearchLabel)}
                />
                <TextField
                  placeholder="Tìm theo địa điểm, danh mục hoặc mô tả"
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  containerStyle={themed($searchFieldContainer)}
                  inputWrapperStyle={themed($residentSearchField)}
                  style={themed($residentSearchInput)}
                  LeftAccessory={SearchLeftAccessory}
                />
              </Animated.View>

              {showFilters && renderFilterPanel()}

              <Animated.View
                entering={createFadeInUp(3)}
                layout={softLayoutTransition}
                style={themed($residentSectionHeader)}
              >
                <View>
                  <Text
                    text="Dòng thời gian báo cáo của bạn"
                    preset="subheading"
                    style={themed($residentSectionTitle)}
                  />
                  <Text
                    size="xs"
                    text={`Đang hiển thị ${filteredReports.length} báo cáo`}
                    style={themed($residentSectionSubtitle)}
                  />
                </View>
                {hasActiveFilters && (
                  <View style={themed($residentActiveFilterPill)}>
                    <Text
                      text="Đang lọc"
                      size="xxxs"
                      preset="bold"
                      style={themed($residentActiveFilterText)}
                    />
                  </View>
                )}
              </Animated.View>

              {filteredReports.length > 0 ? (
                <Animated.View layout={softLayoutTransition} style={themed($residentReportsStack)}>
                  {filteredReports.map((report: any, index: number) => {
                    const statusColor = getStatusColor(report.status)
                    const canEdit =
                      report.status !== "resolved" &&
                      report.status !== "completed" &&
                      isEditable(report.created_at || report.createdAt)

                    return (
                      <Animated.View
                        key={report.id}
                        entering={createFadeInUp(Math.min(index, 7))}
                        layout={softLayoutTransition}
                        style={themed($residentReportCard)}
                      >
                        <View style={themed($residentReportTopRow)}>
                          <View
                            style={[
                              themed($residentStatusPill),
                              {
                                borderColor: `${statusColor}30`,
                                backgroundColor: `${statusColor}12`,
                              },
                            ]}
                          >
                            {report.status === "rejected" ? (
                              <ExclamationCircleIcon size={14} color={statusColor} />
                            ) : report.status === "resolved" || report.status === "completed" ? (
                              <CheckBadgeIcon size={14} color={statusColor} />
                            ) : (
                              <ClockIcon size={14} color={statusColor} />
                            )}
                            <Text
                              size="xxs"
                              preset="bold"
                              text={getStatusLabel(report.status)}
                              style={{ color: statusColor }}
                            />
                          </View>
                          <View style={themed($residentIdPill)}>
                            <Text
                              text={`#${report.id}`}
                              size="xxxs"
                              preset="bold"
                              style={themed($residentIdText)}
                            />
                          </View>
                        </View>

                        <Text
                          text={report.description}
                          preset="bold"
                          numberOfLines={2}
                          style={themed($residentReportTitle)}
                        />
                        <Text
                          text={getStatusHint(report.status)}
                          size="xs"
                          numberOfLines={1}
                          style={themed($residentReportHint)}
                        />

                        {report.images && report.images.length > 0 && (
                          <View style={themed($evidencePreviewSection)}>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={themed($evidencePreviewContainer)}
                            >
                              {getEvidencePreview(report.images).visible.map(
                                (imageUri: string, index: number) => {
                                  const isLast = index === 2
                                  const moreCount = getEvidencePreview(report.images).moreCount

                                  return (
                                    <View key={index} style={$evidenceThumbWrap}>
                                      <Image
                                        source={{ uri: imageUri }}
                                        style={$evidencePreviewThumb as ImageStyle}
                                      />
                                      {isLast && moreCount > 0 && (
                                        <View style={themed($evidenceMoreBadge)}>
                                          <Text
                                            text={`+${moreCount}`}
                                            size="xs"
                                            preset="bold"
                                            style={themed($evidenceMoreBadgeText)}
                                          />
                                        </View>
                                      )}
                                    </View>
                                  )
                                },
                              )}
                            </ScrollView>
                          </View>
                        )}

                        <View style={themed($residentMetaBlock)}>
                          <View style={themed($residentMetaRow)}>
                            <MapIcon size={14} color={colors.textDim} />
                            <Text
                              size="xs"
                              text={`${report.address_line || report.addressLine || ""}${report.ward ? `, ${report.ward}` : ""}${report.district ? `, ${report.district}` : ""}${report.province ? `, ${report.province}` : ""}`}
                              style={themed($residentMetaText)}
                              numberOfLines={2}
                            />
                          </View>
                          <View style={themed($residentMetaRow)}>
                            <Text
                              size="xxs"
                              text={
                                formatReportDate(report.created_at || report.createdAt)
                                  ? `Tạo lúc ${formatReportDate(report.created_at || report.createdAt)}`
                                  : ""
                              }
                              style={themed($residentMetaSubtext)}
                            />
                            <Text
                              size="xxs"
                              text={formatEditWindowHint(report)}
                              style={themed($residentMetaSubtext)}
                            />
                          </View>
                        </View>

                        <View style={themed($residentFooterRow)}>
                          <View style={themed($residentFooterInfo)}>
                            <Text
                              size="xxs"
                              text={getCategorySummary(report.category)}
                              style={themed($residentFooterLabel)}
                            />
                          </View>
                          {canEdit ? (
                            <Button
                              label="Chỉnh sửa"
                              variant="outline"
                              onPress={() => void openEditModal(report)}
                              style={themed($residentEditButton)}
                            />
                          ) : (
                            <View style={themed($residentReadOnlyPill)}>
                              <Text
                                text={report.status === "resolved" ? "Đã đóng" : "Chỉ xem"}
                                size="xxxs"
                                preset="bold"
                                style={themed($residentReadOnlyText)}
                              />
                            </View>
                          )}
                        </View>
                      </Animated.View>
                    )
                  })}
                </Animated.View>
              ) : (
                <Animated.View
                  entering={createFadeInUp(4)}
                  layout={softLayoutTransition}
                  style={themed($residentEmptyStateWrap)}
                >
                  <EmptyState
                    title="Không có báo cáo phù hợp"
                    description="Hãy xóa bộ lọc hoặc tạo báo cáo mới để cập nhật dòng thời gian của bạn."
                    actionLabel="Tạo báo cáo"
                    onAction={openCreateModal}
                  />
                </Animated.View>
              )}
            </>
          )}
        </>
      )}

      {/* Modal Form */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={themed($modalContainer)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={themed($modalBackButton)}
                hitSlop={12}
                disabled={isSubmitting}
              >
                <ChevronLeftIcon size={24} color={colors.text} />
              </Pressable>
              <View style={themed($modalTitleWrap)}>
                <Text
                  preset="subheading"
                  text={formMode === "create" ? "Tạo báo cáo" : "Chỉnh sửa báo cáo"}
                  style={themed($modalTitle)}
                />
                <Text
                  size="xs"
                  text={
                    formMode === "create"
                      ? isSelectingByGps
                        ? "Đang tự động điền vị trí hiện tại..."
                        : "Danh mục, vị trí và hình ảnh minh chứng."
                      : "Chỉnh sửa thông tin báo cáo mới nhất từ hệ thống."
                  }
                  numberOfLines={1}
                  style={themed($modalSubtitle)}
                />
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={themed($formScroll)}
              contentContainerStyle={themed($formScrollContent)}
            >
              <View style={themed($reportComposerHero)}>
                <View style={themed($reportComposerHeroTop)}>
                  <View style={themed($reportComposerHeroBadge)}>
                    <SparklesIcon size={14} color={colors.tint} />
                    <Text
                      text={formMode === "create" ? "Gửi nhanh trong vài bước" : "Cập nhật báo cáo"}
                      size="xxs"
                      preset="bold"
                      style={themed($reportComposerHeroBadgeText)}
                    />
                  </View>
                  <View style={themed($reportComposerHeroState)}>
                    {isSelectingByGps || isSubmitting ? (
                      <ActivityIndicator color={colors.tint} size="small" />
                    ) : isReportDraftReady ? (
                      <CheckIcon size={16} color={colors.success} />
                    ) : (
                      <ClockIcon size={16} color={colors.warning} />
                    )}
                  </View>
                </View>
                <Text
                  text={formMode === "create" ? "Tạo báo cáo thật nhanh" : "Hoàn thiện báo cáo của bạn"}
                  preset="heading"
                  style={themed($reportComposerHeroTitle)}
                />
                <Text
                  text={
                    isSelectingByGps
                      ? "Hệ thống đang đối chiếu GPS với địa chỉ để bạn không phải nhập tay."
                      : formMode === "create"
                        ? "Ưu tiên vị trí và mô tả ngắn để đội ứng phó xử lý nhanh hơn."
                        : "Kiểm tra lại các trường quan trọng rồi lưu cập nhật."
                  }
                  size="sm"
                  style={themed($reportComposerHeroBody)}
                />
                <View style={themed($composerStepsRow)}>
                  {reportComposerSteps.map((step) => (
                    <View
                      key={step.key}
                      style={[
                        themed($composerStepCard),
                        step.complete && themed($composerStepCardComplete),
                      ]}
                    >
                      <View
                        style={[
                          themed($composerStepIcon),
                          step.complete && themed($composerStepIconComplete),
                        ]}
                      >
                        {step.complete ? (
                          <CheckIcon size={12} color={colors.success} />
                        ) : (
                          <ClockIcon size={12} color={colors.textDim} />
                        )}
                      </View>
                      <Text
                        text={step.label}
                        size="xxs"
                        preset="bold"
                        style={themed($composerStepLabel)}
                      />
                      <Text
                        text={step.value}
                        size="xxs"
                        numberOfLines={1}
                        style={themed($composerStepValue)}
                      />
                    </View>
                  ))}
                </View>
              </View>

              <View style={themed($formSection)}>
                <View style={themed($formSectionHeader)}>
                  <View style={themed($formSectionTitleRow)}>
                    <View style={themed($formSectionIcon)}>
                      <DocumentTextIcon size={18} color={colors.tint} />
                    </View>
                    <View style={themed($formSectionTitleCopy)}>
                      <Text text="Điều gì đang xảy ra?" style={themed($formSectionTitle)} />
                      <Text
                        text="Chọn loại sự việc và viết mô tả ngắn để đội xử lý hiểu nhanh."
                        size="xs"
                        style={themed($formSectionSubtitle)}
                      />
                    </View>
                  </View>
                </View>

                <View style={themed($categoryGrid)}>
                  {CATEGORY_OPTIONS.map((option) => {
                    const accentColor = getCategoryAccent(option.value)
                    const isSelected = categories.includes(option.value)

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => toggleCategory(option.value)}
                        disabled={isSubmitting}
                        style={[
                          themed($categoryCard),
                          isSelected && themed($categoryCardSelected),
                          { borderColor: isSelected ? accentColor : colors.border },
                        ]}
                      >
                        <View
                          style={[
                            themed($categoryCardIcon),
                            { backgroundColor: `${accentColor}16` },
                          ]}
                        >
                          {renderCategoryIcon(option.value, accentColor)}
                        </View>
                        <View style={themed($categoryCardCopy)}>
                          <Text
                            text={option.label}
                            preset="bold"
                            numberOfLines={1}
                            style={themed($categoryCardTitle)}
                          />
                          <Text
                            text={isSelected ? "Đã chọn" : "Chạm để thêm"}
                            size="xxs"
                            style={themed($categoryCardHint)}
                          />
                        </View>
                        {isSelected ? (
                          <View style={themed($categoryCardCheck)}>
                            <CheckIcon size={14} color={accentColor} />
                          </View>
                        ) : null}
                      </Pressable>
                    )
                  })}
                </View>

                {categories.length > 0 && (
                  <View style={themed($selectedCategoryChipsCompact)}>
                    {categories.map((category) => {
                      const accentColor = getCategoryAccent(category)
                      return (
                        <View
                          key={category}
                          style={[
                            themed($selectedCategoryChip),
                            { borderColor: `${accentColor}33`, backgroundColor: `${accentColor}10` },
                          ]}
                        >
                          {renderCategoryIcon(category, accentColor)}
                          <Text
                            text={getCategoryLabel(category)}
                            size="xs"
                            preset="bold"
                            style={[themed($selectedCategoryChipText), { color: accentColor }]}
                          />
                        </View>
                      )
                    })}
                  </View>
                )}
                <TextField
                  label="Mô tả ngắn"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ví dụ: Nước ngập vào nhà, xe không thể đi qua, cần hỗ trợ khẩn cấp..."
                  helper="Nêu rõ tình trạng hiện tại để đội xử lý ưu tiên đúng."
                  multiline
                  numberOfLines={4}
                  containerStyle={themed($formFieldSpacing)}
                />
              </View>

              <View style={themed($formSection)}>
                <View style={themed($formSectionHeader)}>
                  <View style={themed($formSectionTitleRow)}>
                    <View style={themed($formSectionIcon)}>
                      <MapPinIcon size={18} color={colors.tint} />
                    </View>
                    <View style={themed($formSectionTitleCopy)}>
                      <Text text="Sự việc ở đâu?" style={themed($formSectionTitle)} />
                      <Text
                        text="Lấy vị trí tự động trước, sau đó chỉnh lại nếu cần."
                        size="xs"
                        style={themed($formSectionSubtitle)}
                      />
                    </View>
                  </View>
                </View>

                <Button
                  variant="default"
                  onPress={() => void handleSelectByGps()}
                  isLoading={isSelectingByGps}
                  disabled={isSubmitting || isSelectingByGps}
                  style={themed($gpsHeroButton)}
                >
                  <View style={themed($gpsHeroButtonContent)}>
                    <View style={themed($gpsHeroButtonIcon)}>
                      <ArrowPathIcon size={18} color={colors.palette.neutral100} />
                    </View>
                    <View style={themed($gpsHeroButtonCopy)}>
                      <Text
                        text={isSelectingByGps ? "Đang lấy vị trí GPS" : "Dùng vị trí hiện tại"}
                        preset="bold"
                        style={themed($gpsHeroButtonTitle)}
                      />
                      <Text
                        text="Tự động điền tỉnh/thành phố, quận/huyện, phường/xã và địa chỉ."
                        size="xxs"
                        style={themed($gpsHeroButtonHint)}
                      />
                    </View>
                  </View>
                </Button>

                <View style={themed($locationSummaryCard)}>
                  <View style={themed($locationAssistIcon)}>
                    {isSelectingByGps ? (
                      <ActivityIndicator color={colors.tint} size="small" />
                    ) : (
                      <MapPinIcon size={18} color={colors.tint} />
                    )}
                  </View>
                  <View style={themed($locationAssistCopy)}>
                    <Text
                      text={ward ? "Vị trí đã sẵn sàng" : "Chưa hoàn tất vị trí"}
                      preset="bold"
                      style={themed($locationAssistTitle)}
                    />
                    <Text
                      text={
                        fullAddressPreview === "Chưa nhập địa chỉ"
                          ? "Nhấn nút GPS để điền nhanh địa chỉ, sau đó chỉnh nếu cần."
                          : fullAddressPreview
                      }
                      size="xs"
                      style={themed($locationAssistHint)}
                    />
                  </View>
                </View>

                <View style={themed($locationFieldContainer)}>
                  <Text text="Tỉnh/thành phố" style={themed($locationFieldLabel)} />
                  <Pressable
                    style={[themed($locationSelector), isSubmitting && $locationSelectorDisabled]}
                    disabled={isSubmitting || isProvincesLoading || isSelectingByGps}
                    onPress={() => setActivePicker("province")}
                  >
                    <View style={themed($selectorContent)}>
                      <View style={themed($selectorLeading)}>
                        <View style={themed($selectorLeadingIcon)}>
                          <MapPinIcon size={16} color={colors.tint} />
                        </View>
                        <View style={themed($selectorCopy)}>
                          <Text
                            text={province || "Chọn tỉnh/thành phố"}
                            preset="bold"
                            numberOfLines={1}
                            style={
                              province
                                ? themed($locationSelectorValue)
                                : themed($locationSelectorPlaceholder)
                            }
                          />
                          <Text
                            text={
                              isProvincesLoading
                                ? "Đang tải danh sách tỉnh/thành phố..."
                                : "Tỉnh/thành phố chính của báo cáo này"
                            }
                            size="xs"
                            numberOfLines={1}
                            style={themed($selectorHint)}
                          />
                        </View>
                      </View>
                      {isProvincesLoading ? (
                        <ActivityIndicator color={colors.tint} size="small" />
                      ) : (
                        <ChevronDownIcon size={18} color={colors.textDim} />
                      )}
                    </View>
                  </Pressable>
                </View>

                <View style={themed($locationFieldContainer)}>
                  <Text text="Quận/huyện" style={themed($locationFieldLabel)} />
                  <Pressable
                    style={[
                      themed($locationSelector),
                      (!selectedProvinceCode || isSubmitting) && $locationSelectorDisabled,
                    ]}
                    disabled={
                      !selectedProvinceCode ||
                      isSubmitting ||
                      isDistrictsLoading ||
                      isSelectingByGps
                    }
                    onPress={() => setActivePicker("district")}
                  >
                    <View style={themed($selectorContent)}>
                      <View style={themed($selectorLeading)}>
                        <View style={themed($selectorLeadingIcon)}>
                          <MapIcon size={16} color={colors.info} />
                        </View>
                        <View style={themed($selectorCopy)}>
                          <Text
                            text={
                              district ||
                              (selectedProvinceCode
                                ? "Chọn quận/huyện"
                                : "Hãy chọn tỉnh/thành phố trước")
                            }
                            preset="bold"
                            numberOfLines={1}
                            style={
                              district
                                ? themed($locationSelectorValue)
                                : themed($locationSelectorPlaceholder)
                            }
                          />
                          <Text
                            text={
                              isDistrictsLoading
                                ? "Đang tải danh sách quận/huyện..."
                                : "Quận/huyện trong tỉnh/thành phố đã chọn"
                            }
                            size="xs"
                            numberOfLines={1}
                            style={themed($selectorHint)}
                          />
                        </View>
                      </View>
                      {isDistrictsLoading ? (
                        <ActivityIndicator color={colors.info} size="small" />
                      ) : (
                        <ChevronDownIcon size={18} color={colors.textDim} />
                      )}
                    </View>
                  </Pressable>
                </View>

                <View style={themed($locationFieldContainer)}>
                  <Text text="Phường/xã" style={themed($locationFieldLabel)} />
                  <Pressable
                    style={[
                      themed($locationSelector),
                      (!selectedDistrictCode || isSubmitting) && $locationSelectorDisabled,
                    ]}
                    disabled={
                      !selectedDistrictCode || isSubmitting || isWardsLoading || isSelectingByGps
                    }
                    onPress={() => setActivePicker("ward")}
                  >
                    <View style={themed($selectorContent)}>
                      <View style={themed($selectorLeading)}>
                        <View style={themed($selectorLeadingIcon)}>
                          <MapPinIcon size={16} color={colors.success} />
                        </View>
                        <View style={themed($selectorCopy)}>
                          <Text
                            text={
                              ward ||
                              (selectedDistrictCode ? "Chọn phường/xã" : "Hãy chọn quận/huyện trước")
                            }
                            preset="bold"
                            numberOfLines={1}
                            style={
                              ward
                                ? themed($locationSelectorValue)
                                : themed($locationSelectorPlaceholder)
                            }
                          />
                          <Text
                            text={
                              isWardsLoading
                                ? "Đang tải danh sách phường/xã..."
                                : "Phường/xã gần nhất để đội ứng phó xác định vị trí"
                            }
                            size="xs"
                            numberOfLines={1}
                            style={themed($selectorHint)}
                          />
                        </View>
                      </View>
                      {isWardsLoading ? (
                        <ActivityIndicator color={colors.success} size="small" />
                      ) : (
                        <ChevronDownIcon size={18} color={colors.textDim} />
                      )}
                    </View>
                  </Pressable>
                </View>
                <TextField
                  label="Số nhà, tên đường"
                  value={addressLine}
                  onChangeText={setAddressLine}
                  placeholder="Ví dụ: 12 Bạch Đằng"
                  helper="Địa chỉ càng cụ thể thì điều phối càng nhanh."
                  containerStyle={themed($formFieldSpacing)}
                />

                <View style={themed($addressPreviewCard)}>
                  <View style={themed($addressPreviewHeader)}>
                    <Text text="Địa chỉ đầy đủ" style={themed($fullAddressPreviewLabel)} />
                    <Text
                      text={hasLocationReady ? "Đã sẵn sàng" : "Cần kiểm tra"}
                      size="xxs"
                      preset="bold"
                      style={themed($addressPreviewStatus)}
                    />
                  </View>
                  <Text
                    text={fullAddressPreview}
                    style={
                      fullAddressPreview === "Chưa nhập địa chỉ"
                        ? themed($fullAddressPreviewPlaceholder)
                        : themed($fullAddressPreviewValue)
                    }
                  />
                </View>
              </View>

              <View style={themed($evidenceSection)}>
                <View style={themed($formSectionHeader)}>
                  <View style={themed($formSectionTitleRow)}>
                    <View style={themed($formSectionIcon)}>
                      <PhotoIcon size={18} color={colors.tint} />
                    </View>
                    <View style={themed($formSectionTitleCopy)}>
                      <Text text="Ảnh minh chứng" style={themed($formSectionTitle)} />
                      <Text
                        text="Không bắt buộc, nhưng rất hữu ích để xác minh tình trạng."
                        size="xs"
                        style={themed($formSectionSubtitle)}
                      />
                    </View>
                  </View>
                  <Text text={`${totalEvidenceCount}/5 ảnh`} size="xxs" preset="bold" style={themed($evidenceCount)} />
                </View>

                {(existingImages.length > 0 || selectedImages.length > 0) && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={themed($evidenceThumbScroller)}
                    contentContainerStyle={themed($evidenceThumbScrollerContent)}
                  >
                    {existingImages.map((uri, index) => (
                      <View key={`existing-${index}`} style={$evidenceThumbWrap}>
                        <Image source={{ uri }} style={$evidenceThumb as ImageStyle} />
                        <Pressable
                          style={themed($evidenceRemoveBtn)}
                          onPress={() => removeExistingImage(index)}
                          hitSlop={8}
                        >
                          <XMarkIcon size={12} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                    {selectedImages.map((item, index) => (
                      <View key={`selected-${index}`} style={$evidenceThumbWrap}>
                        <Image source={{ uri: item.uri }} style={$evidenceThumb as ImageStyle} />
                        <Pressable
                          style={themed($evidenceRemoveBtn)}
                          onPress={() => removeSelectedImage(index)}
                          hitSlop={8}
                        >
                          <XMarkIcon size={12} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <Button
                  variant="outline"
                  onPress={() => void handlePickEvidence()}
                  disabled={isSubmitting || totalEvidenceCount >= 5}
                  style={themed($evidenceButton)}
                >
                  <View style={themed($buttonInlineContent)}>
                    <PhotoIcon size={16} color={colors.textPrimary} />
                    <Text
                      text={
                        totalEvidenceCount === 0 ? "Thêm ảnh minh chứng" : "Thêm ảnh khác"
                      }
                      preset="bold"
                      style={themed($buttonInlineText)}
                    />
                  </View>
                </Button>
                <Text
                  text="Có thể gửi trước rồi bổ sung ảnh sau nếu đang cần báo nhanh."
                  size="xs"
                  style={themed($evidenceHint)}
                />
              </View>

              <View style={themed($modalFooterSummary)}>
                <Text
                  text={
                    isReportDraftReady
                      ? "Đủ thông tin cơ bản để gửi báo cáo."
                      : "Hãy chọn danh mục, thêm mô tả và xác nhận vị trí."
                  }
                  size="xs"
                  style={themed($modalFooterSummaryText)}
                />
              </View>

              <View style={themed($modalActionRow)}>
                <Button
                  label="Hủy"
                  variant="secondary"
                  onPress={() => setIsModalVisible(false)}
                  style={themed($modalActionButton)}
                  disabled={isSubmitting}
                />
                <Button
                  label={formMode === "create" ? "Gửi báo cáo" : "Lưu thay đổi"}
                  variant="default"
                  onPress={handleSubmit}
                  style={themed($modalActionButtonPrimary)}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activePicker !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={themed($pickerOverlay)}>
          <View style={themed($pickerContent)}>
            <View style={themed($pickerHeader)}>
              <View style={themed($pickerHeaderContent)}>
                <View style={themed($pickerHeaderIconWrap)}>
                  {activePicker === "category" ? (
                    <DocumentTextIcon size={18} color={colors.tint} />
                  ) : (
                    <MapPinIcon size={18} color={colors.tint} />
                  )}
                </View>
                <View style={themed($pickerHeaderCopy)}>
                  <Text
                    preset="subheading"
                    text={getPickerTitle()}
                    style={themed($pickerHeaderTitle)}
                  />
                  <Text text={pickerDescription} size="xs" style={themed($pickerHeaderSubtitle)} />
                </View>
              </View>
              <Pressable onPress={() => setActivePicker(null)} style={themed($pickerCloseButton)}>
                <XMarkIcon size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            {isPickerLoading() ? (
              <View style={themed($pickerLoadingState)}>
                <ActivityIndicator color={colors.tint} size="small" />
                <Text text="Đang tải lựa chọn..." style={themed($pickerEmptyText)} />
              </View>
            ) : (
              <ScrollView style={themed($pickerScrollView)}>
                {pickerOptions.length > 0 ? (
                  pickerOptions.map((option) => {
                    const optValue = "value" in option ? option.value : null
                    const optionCode = "code" in option ? option.code : null
                    const isSelectedCategory =
                      activePicker === "category" &&
                      !!optValue &&
                      categories.includes(optValue as ReportCategory)
                    const isSelectedLocation =
                      (activePicker === "province" && optionCode === selectedProvinceCode) ||
                      (activePicker === "district" && optionCode === selectedDistrictCode) ||
                      (activePicker === "ward" && optionCode === _selectedWardCode)
                    const isSelectedOption = isSelectedCategory || isSelectedLocation
                    const optionTone =
                      "toneColor" in option && option.toneColor ? option.toneColor : colors.tint
                    return (
                      <Pressable
                        key={option.key}
                        style={[
                          themed($pickerOption),
                          isSelectedOption && themed($pickerOptionSelected),
                        ]}
                        onPress={() => handlePickerSelect(option)}
                      >
                        <View style={themed($pickerOptionRow)}>
                          <View
                            style={[
                              themed($pickerOptionIconWrap),
                              { borderColor: optionTone, backgroundColor: colors.background },
                            ]}
                          >
                            {activePicker === "category" && optValue ? (
                              renderCategoryIcon(optValue as ReportCategory, optionTone)
                            ) : (
                              <MapPinIcon size={16} color={optionTone} />
                            )}
                          </View>
                          <View style={themed($pickerOptionCopy)}>
                            <Text
                              text={option.label}
                              preset={isSelectedOption ? "bold" : "default"}
                              style={themed($pickerOptionLabel)}
                            />
                            <Text
                              text={
                                activePicker === "category"
                                  ? "Chạm lại để bỏ chọn"
                                  : isSelectedOption
                                    ? "Đang được chọn"
                                    : "Chạm để chọn"
                              }
                              size="xs"
                              style={themed($pickerOptionHint)}
                            />
                          </View>
                          {isSelectedOption ? (
                            <View
                              style={[
                                themed($pickerOptionCheck),
                                { borderColor: optionTone, backgroundColor: colors.background },
                              ]}
                            >
                              <CheckIcon size={14} color={optionTone} strokeWidth={2.5} />
                            </View>
                          ) : (
                            <ChevronDownIcon size={16} color={colors.textDim} />
                          )}
                        </View>
                      </Pressable>
                    )
                  })
                ) : (
                  <View style={themed($pickerEmptyState)}>
                    <Text text="Không có lựa chọn nào." style={themed($pickerEmptyText)} />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  width: "100%",
})

const $topBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  alignItems: "flex-start",
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 0,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
})

const $backButtonContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
})

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
  marginVertical: spacing.xxl,
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xl,
})

const $errorBox: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.palette.angry100,
  borderRadius: 12,
  padding: spacing.md,
  borderLeftWidth: 4,
  borderLeftColor: colors.error,
})

const $errorTitle: TextStyle = {
  marginBottom: 8,
}

const $errorMessage: TextStyle = {
  lineHeight: 20,
}

const $retryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.md,
  lineHeight: 44,
  letterSpacing: 0,
  color: colors.text,
  textAlign: "center",
})

const $summaryContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: 24,
  marginBottom: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
})

const $summaryHeading: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.sm,
  letterSpacing: -0.374,
  color: colors.text,
})

const $listHeading: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginTop: spacing.lg,
  marginBottom: spacing.md,
  letterSpacing: -0.28,
  color: colors.text,
})

const $reportItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  paddingVertical: spacing.md,
})

const $reportHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
})

const $reportMeta: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
  letterSpacing: -0.12,
})

const $heroCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 18,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})

const $filterPanel: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.sm,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
})

const $filterHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}

const $filterLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginBottom: 6,
  fontWeight: "600",
})

const $filterRow: ViewStyle = {
  flexDirection: "row",
  gap: 4,
  marginBottom: 10,
  paddingRight: 10,
}

const $filterChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
})

const $filterChipSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.statusInfoBackground,
})

const $heroHeaderRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
})

const $heroHeaderContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $heroFilterButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xs,
  minHeight: 0,
})

const $heroTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  marginBottom: 8,
})

const $heroSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.md,
})

const $heroMetaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $heroCountPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
})

const $heroCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $residentHeroCard: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  position: "relative",
  overflow: "hidden",
  backgroundColor: colors.surfaceRaised,
  borderRadius: 22,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: isDark ? 0.12 : 0.1,
  shadowRadius: 20,
  elevation: 3,
})

const $residentHeroAccent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 180,
  height: 180,
  borderRadius: 999,
  backgroundColor: colors.statusInfoBackground,
  top: -70,
  right: -30,
})

const $residentHeroHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $residentBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: colors.statusInfoBackground,
  borderWidth: 1,
  borderColor: `${colors.tint}20`,
})

const $residentBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $residentSyncText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $residentHeroTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  marginBottom: spacing.xs,
  lineHeight: 34,
})

const $residentHeroSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $residentActionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
})

const $residentPrimaryButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $residentPrimaryButtonContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
})

const $residentPrimaryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $residentSecondaryButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $residentHighlightCard: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  padding: spacing.sm,
  marginTop: spacing.xs,
  borderRadius: 16,
  backgroundColor: isDark ? colors.surfaceAlt : colors.surfaceBackdrop,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentHighlightIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surface,
})

const $residentHighlightCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $residentHighlightLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xxs,
})

const $residentHighlightTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $residentHighlightHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textSecondary,
  marginTop: spacing.xxs,
})

const $residentSummaryGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xxs,
  marginBottom: spacing.md,
})

const $residentSummaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  minWidth: 0,
  borderRadius: 16,
  padding: spacing.xs,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentSummaryTopRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-start",
  gap: spacing.xxs,
  marginBottom: spacing.xxs,
})

const $residentSummaryIconWrap: ThemedStyle<ViewStyle> = () => ({
  width: 30,
  height: 30,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
})

const $residentSummaryValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontSize: 22,
  lineHeight: 26,
})

const $residentSummaryLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $residentSearchCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceRaised,
  borderRadius: 16,
  padding: spacing.sm,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentSearchLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xs,
})

const $residentSearchField: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minHeight: 48,
  borderRadius: 14,
  backgroundColor: colors.inputBackground,
  borderColor: colors.inputBorder,
  borderWidth: 1,
  paddingHorizontal: spacing.sm,
})

const $residentSearchInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $reportSearchAccessory: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
  justifyContent: "center",
  alignItems: "center",
})

const $residentFilterPanel: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceRaised,
  borderRadius: 16,
  padding: spacing.sm,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentSectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $residentSectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $residentSectionSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $residentActiveFilterPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: colors.statusInfoBackground,
  borderWidth: 1,
  borderColor: `${colors.tint}20`,
})

const $residentActiveFilterText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $residentReportsStack: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $residentReportCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceRaised,
  borderRadius: 18,
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentReportTopRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.xs,
})

const $residentStatusPill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
})

const $residentIdPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentIdText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $residentReportTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  lineHeight: 22,
  marginBottom: spacing.xxs,
})

const $residentReportHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textSecondary,
  marginBottom: spacing.sm,
})

const $residentMetaBlock: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceAlt,
  borderRadius: 14,
  padding: spacing.sm,
  marginBottom: spacing.sm,
  gap: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentMetaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.xs,
})

const $residentMetaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textSecondary,
})

const $residentMetaSubtext: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $residentFooterRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
})

const $residentFooterInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $residentFooterLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $residentEditButton: ThemedStyle<ViewStyle> = () => ({
  minWidth: 84,
})

const $residentReadOnlyPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: colors.border,
})

const $residentReadOnlyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $residentEmptyStateWrap: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderRadius: 22,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceRaised,
})

const $reportsStack: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $reportCategoryRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xxs,
  marginBottom: spacing.xs,
})

const $reportCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceRaised,
  borderRadius: 18,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
})

const $reportCardTopRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
})

const $cardContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  paddingRight: 8,
})

const $categoryPill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderWidth: 1,
  borderRadius: 999,
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
})

const $categoryPillText: ThemedStyle<TextStyle> = () => ({
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: 0.2,
})

const $uncategorizedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
})

const $uncategorizedBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $statusPill: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 999,
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
})

const $statusPillText: ThemedStyle<TextStyle> = () => ({
  fontWeight: "700",
  textTransform: "capitalize",
})

const $reportTitleModern: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  lineHeight: 24,
})

const $reportTitleModernSpacing: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $reportMetaModern: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $reportFooterRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: spacing.sm,
})

const $reportActionText: ThemedStyle<TextStyle> = () => ({
  textDecorationLine: "underline",
  fontWeight: "700",
})

const $evidencePreviewSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $evidencePreviewContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $evidencePreviewThumb: ImageStyle = {
  width: 52,
  height: 52,
  borderRadius: 8,
}

const $evidenceMoreBadge: ThemedStyle<ViewStyle> = () => ({
  ...$evidencePreviewThumb,
  position: "absolute",
  top: 0,
  left: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
})

const $evidenceMoreBadgeText: ThemedStyle<TextStyle> = () => ({
  color: "#ffffff",
})

const $reportTitle: TextStyle = {
  flex: 1,
  marginRight: 8,
  letterSpacing: -0.374,
}

const $reportStatus: TextStyle = {
  letterSpacing: -0.224,
}

const $skeletonMargin: ViewStyle = {
  marginBottom: 12,
}

const $modalContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.overlay20,
  justifyContent: "center",
})

const $modalContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.surfaceRaised,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  paddingTop: spacing.md,
  paddingHorizontal: spacing.sm,
  paddingBottom: spacing.lg,
  maxHeight: "100%",
})

const $modalHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $modalBackButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: colors.border,
})

const $modalTitleWrap: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $modalSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $formScroll: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $formScrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xl,
  gap: spacing.sm,
})

const $reportComposerHero: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  borderRadius: 20,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: isDark ? colors.surfaceAlt : colors.surfaceRaised,
  gap: spacing.sm,
})

const $reportComposerHeroTop: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $reportComposerHeroBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: `${colors.tint}22`,
  backgroundColor: colors.statusInfoBackground,
})

const $reportComposerHeroBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $reportComposerHeroState: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surface,
})

const $reportComposerHeroTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  lineHeight: 28,
})

const $reportComposerHeroBody: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
  lineHeight: 20,
})

const $composerStepsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
})

const $composerStepCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  minWidth: 0,
  borderRadius: 16,
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  gap: spacing.xxs,
})

const $composerStepCardComplete: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: `${colors.success}33`,
  backgroundColor: colors.statusSuccessBackground,
})

const $composerStepIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 24,
  height: 24,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surfaceAlt,
})

const $composerStepIconComplete: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: `${colors.success}12`,
})

const $composerStepLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $composerStepValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $formSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.sm,
  backgroundColor: colors.surfaceRaised,
})

const $formSectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $formSectionTitleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  flex: 1,
  gap: spacing.sm,
})

const $formSectionTitleCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $formSectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontWeight: "700",
})

const $formSectionSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $formSectionIcon: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: isDark ? colors.surfaceAlt : colors.surface,
})

const $categoryGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $categoryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "48%",
  minHeight: 88,
  borderRadius: 18,
  borderWidth: 1,
  padding: spacing.sm,
  backgroundColor: colors.surface,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $categoryCardSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surfaceRaised,
})

const $categoryCardIcon: ThemedStyle<ViewStyle> = () => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
})

const $categoryCardCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $categoryCardTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $categoryCardHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $categoryCardCheck: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 26,
  height: 26,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surfaceAlt,
})

const $selectorContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $selectorLeading: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $selectorLeadingIcon: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: isDark ? colors.surfaceAlt : colors.surface,
})

const $selectorCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $selectorHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $selectedCategoryChipsCompact: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xxs,
  marginBottom: spacing.sm,
})

const $selectedCategoryChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
  backgroundColor: colors.surfaceAlt,
})

const $selectedCategoryChipText: ThemedStyle<TextStyle> = () => ({
  textTransform: "uppercase",
})

const $formFieldSpacing: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 0,
})

const $gpsHeroButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $gpsHeroButtonContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $gpsHeroButtonIcon: ThemedStyle<ViewStyle> = () => ({
  width: 34,
  height: 34,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.14)",
})

const $gpsHeroButtonCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $gpsHeroButtonTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $gpsHeroButtonHint: ThemedStyle<TextStyle> = () => ({
  color: "rgba(255,255,255,0.86)",
})

const $buttonInlineContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
})

const $buttonInlineText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $locationSummaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.sm,
  marginBottom: spacing.sm,
  backgroundColor: isDark ? colors.surfaceAlt : colors.surface,
})

const $locationAssistIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.statusInfoBackground,
})

const $locationAssistCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $locationAssistTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $locationAssistHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $modalFooterSummary: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  backgroundColor: colors.surfaceAlt,
})

const $modalFooterSummaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $modalActionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.xs,
})

const $modalActionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $modalActionButtonPrimary: ThemedStyle<ViewStyle> = () => ({
  flex: 1.25,
})

const $searchFieldContainer: ThemedStyle<ViewStyle> = () => ({
  gap: 0,
})

const $locationFieldContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  gap: spacing.xs,
})

const $locationFieldLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontWeight: "700",
})

const $locationSelector: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minHeight: 48,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.inputBorder,
  backgroundColor: colors.inputBackground,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.sm,
})

const $locationSelectorValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $locationSelectorPlaceholder: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $locationSelectorChevron: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $locationSelectorDisabled: ViewStyle = {
  opacity: 0.55,
}

const $pickerOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: colors.palette.overlay20,
})

const $pickerContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceRaised,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.md,
  paddingBottom: spacing.lg,
})

const $pickerHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.sm,
})

const $pickerHeaderContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  gap: spacing.sm,
})

const $pickerHeaderIconWrap: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.statusInfoBackground,
})

const $pickerHeaderCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $pickerHeaderTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $pickerHeaderSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $pickerCloseButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
})

const $pickerOption: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  marginBottom: spacing.xs,
  backgroundColor: colors.surfaceAlt,
})

const $pickerOptionSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.statusInfoBackground,
})

const $pickerOptionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $pickerOptionIconWrap: ThemedStyle<ViewStyle> = () => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
})

const $pickerOptionCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $pickerOptionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $pickerOptionHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $pickerOptionCheck: ThemedStyle<ViewStyle> = () => ({
  width: 28,
  height: 28,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
})

const $pickerEmptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
})

const $pickerLoadingState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl,
  gap: spacing.sm,
  alignItems: "center",
  justifyContent: "center",
})

const $pickerScrollView: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 420,
})

const $pickerEmptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $pickerFooter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  paddingTop: spacing.sm,
  marginTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
})

const $pickerFooterText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textDim,
})

const $pickerFooterButton: ThemedStyle<ViewStyle> = () => ({
  minWidth: 96,
})

const $addressPreviewCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  marginBottom: spacing.sm,
  backgroundColor: colors.surfaceAlt,
})

const $addressPreviewHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  marginBottom: spacing.xxs,
})

const $addressPreviewStatus: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $fullAddressPreviewLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xxs,
})

const $fullAddressPreviewValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $fullAddressPreviewPlaceholder: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $evidenceSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.sm,
  marginBottom: spacing.sm,
  backgroundColor: colors.surfaceRaised,
  gap: spacing.xs,
})

const $evidenceCount: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $evidenceThumbWrap: ViewStyle = {
  position: "relative",
  width: 80,
  height: 80,
  borderRadius: 10,
  overflow: "hidden",
}

const $evidenceThumb: ImageStyle = {
  width: 80,
  height: 80,
  borderRadius: 10,
}

const $evidenceRemoveBtn: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 4,
  right: 4,
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: "rgba(0,0,0,0.6)",
  alignItems: "center",
  justifyContent: "center",
})

const $evidenceThumbScroller: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $evidenceThumbScrollerContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $evidenceButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  marginBottom: spacing.xxs,
})

const $evidenceHint: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 2,
})
