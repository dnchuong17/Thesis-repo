import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  Image,
  ImageStyle,
  Linking,
  Pressable,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import * as Location from "expo-location"
import { ArrowLeftIcon } from "react-native-heroicons/outline"

import { Button } from "@/components/Button"
import { ReliefDirectionsMap, type MapCoordinate } from "@/components/ReliefDirectionsMap"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { reportService } from "@/services/api/reportService"
import type { Report } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { getFastDeviceLocation } from "@/utils/deviceLocation"

interface ReliefReportDetailScreenProps extends AppStackScreenProps<"ReliefReportDetailScreen"> {}

type LocationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "permission-denied"
  | "unavailable"
  | "missing-destination"

const statusColors: Record<string, string> = {
  "pending": "#EAB308",
  "in-progress": "#3B82F6",
  "resolved": "#10B981",
  "rejected": "#EF4444",
}

const statusLabels: Record<string, string> = {
  "pending": "Chờ xác minh",
  "verified": "Đã xác minh",
  "in-progress": "Đang xử lý",
  "completed": "Đã xử lý",
  "resolved": "Đã xử lý",
  "rejected": "Bị từ chối",
}

function formatDateTime(value?: string) {
  if (!value) return "Không rõ"
  const safeValue = value.replace(" ", "T")
  const parsed = new Date(safeValue)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("vi-VN")
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)} km`
  return `${Math.round(distanceMeters)} m`
}

function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${totalMinutes} phút`
  if (minutes === 0) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

function translateCategoryPart(value: string) {
  const normalized = value.trim().toLowerCase()

  if (normalized === "flood") return "Ngập lụt"
  if (normalized === "incident") return "Sự cố"
  if (normalized === "infrastructure") return "Hạ tầng"
  if (normalized === "rescue") return "Cứu hộ"
  return value.trim()
}

function hasCoordinates(
  report: Report | null,
): report is Report & Required<Pick<Report, "latitude" | "longitude">> {
  return typeof report?.latitude === "number" && typeof report?.longitude === "number"
}

function buildGoogleMapsDirectionsUrl(destination: MapCoordinate, origin?: MapCoordinate | null) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: "driving",
  })

  if (origin) {
    params.set("origin", `${origin.latitude},${origin.longitude}`)
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export const ReliefReportDetailScreen: FC<ReliefReportDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const preloadedReport = route.params.report
  const reportId = route.params.reportId

  const [loading, setLoading] = useState(!preloadedReport)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(preloadedReport ?? null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle")
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<MapCoordinate | null>(null)
  const [routeSummary, setRouteSummary] = useState<{
    distanceMeters: number
    durationSeconds: number
  } | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const numericReportId = Number.parseInt(reportId, 10)
      if (Number.isNaN(numericReportId)) {
        setError("Không tìm thấy báo cáo này.")
        return
      }

      const result = await reportService.getReportForRelief(numericReportId)
      if (result.kind !== "ok") {
        if (result.kind === "not-found") {
          setError("Không tìm thấy báo cáo này.")
          return
        }
        setError("Không thể tải chi tiết báo cáo.")
        return
      }

      setReport(result.data)
    } catch (loadError) {
      console.error("Error loading relief report details:", loadError)
      setError("Không thể tải chi tiết báo cáo.")
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (preloadedReport && String(preloadedReport.id) === reportId) {
      setReport(preloadedReport)
      setError(null)
      setLoading(false)
      return
    }

    void loadReport()
  }, [loadReport, preloadedReport, reportId])

  const destination = useMemo<MapCoordinate | null>(() => {
    if (!hasCoordinates(report)) return null
    return {
      latitude: report.latitude,
      longitude: report.longitude,
    }
  }, [report])

  const fullAddress = useMemo(() => {
    if (!report) return ""
    return [report.address_line, report.ward, report.district, report.province]
      .filter((value, index, allValues) => Boolean(value) && allValues.indexOf(value) === index)
      .join(", ")
  }, [report])

  const categoryLabels = useMemo(() => {
    if (!report?.category) return []
    return String(report.category)
      .split(",")
      .map((value) => translateCategoryPart(value))
      .filter(Boolean)
  }, [report?.category])

  const requestCurrentLocation = useCallback(async () => {
    if (!report) return

    if (!hasCoordinates(report)) {
      setCurrentLocation(null)
      setRouteSummary(null)
      setRouteError(null)
      setLocationStatus("missing-destination")
      setLocationMessage(
        "Báo cáo này chưa có tọa độ bản đồ nên chưa thể chỉ đường.",
      )
      return
    }

    setLocationStatus("loading")
    setLocationMessage("Đang tìm vị trí hiện tại của bạn...")
    setRouteSummary(null)
    setRouteError(null)

    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== "granted") {
        setCurrentLocation(null)
        setLocationStatus("permission-denied")
        setLocationMessage(
          "Hãy cho phép truy cập vị trí để tạo chỉ đường từ vị trí hiện tại của bạn.",
        )
        return
      }

      const position = await getFastDeviceLocation()

      if (!position) {
        throw new Error("Current location unavailable")
      }

      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
      setLocationStatus("ready")
      setLocationMessage(null)
    } catch (locationError) {
      console.error("Error getting responder location:", locationError)
      setCurrentLocation(null)
      setLocationStatus("unavailable")
      setLocationMessage("Hiện không thể xác định vị trí của bạn. Vui lòng thử lại.")
    }
  }, [report])

  useEffect(() => {
    if (!report) return
    void requestCurrentLocation()
  }, [report, requestCurrentLocation])

  const openDirectionsInGoogleMaps = useCallback(async () => {
    if (!destination) return

    try {
      const url = buildGoogleMapsDirectionsUrl(destination, currentLocation)
      await Linking.openURL(url)
    } catch (openError) {
      console.error("Error opening Google Maps directions:", openError)
      setRouteError("Hiện không thể mở Google Maps.")
    }
  }, [currentLocation, destination])

  const renderRouteSection = () => {
    if (!report) return null

    if (!destination) {
      return (
        <View style={themed($messageCard)}>
          <Text
            text={locationMessage || "Cần có tọa độ để hiển thị chỉ đường."}
            size="sm"
            style={{ color: colors.textSecondary }}
          />
        </View>
      )
    }

    if (locationStatus === "loading" || locationStatus === "idle") {
      return (
        <View style={themed($messageCard)}>
          <Text
            text={locationMessage || "Đang tìm vị trí hiện tại của bạn..."}
            size="sm"
            style={{ color: colors.textSecondary }}
          />
        </View>
      )
    }

    if (locationStatus === "permission-denied" || locationStatus === "unavailable") {
      return (
        <View style={themed($messageCard)}>
          <Text
            text={locationMessage || "Hiện chưa thể chỉ đường."}
            size="sm"
            style={{ color: colors.textSecondary }}
          />
          <View style={themed($routeActionRow)}>
            <Button
              label="Mở bằng Google Maps"
              variant="primary"
              onPress={() => void openDirectionsInGoogleMaps()}
              style={themed($routeActionButton)}
            />
            <Button
              label="Thử lấy lại vị trí"
              variant="outline"
              onPress={() => void requestCurrentLocation()}
              style={themed($routeActionButton)}
            />
          </View>
        </View>
      )
    }

    if (!currentLocation) {
      return (
        <View style={themed($messageCard)}>
          <Text
            text="Tạm thời chưa thể chỉ đường."
            size="sm"
            style={{ color: colors.textSecondary }}
          />
        </View>
      )
    }

    return (
      <View style={themed($routeContent)}>
        {(routeSummary || routeError) && (
          <View style={themed($routeSummaryRow)}>
            {routeSummary && (
              <>
                <View
                  style={[themed($summaryPill), { backgroundColor: colors.statusInfoBackground }]}
                >
                  <Text
                    text={formatDistance(routeSummary.distanceMeters)}
                    size="xxs"
                    weight="bold"
                    style={{ color: colors.statusInfo }}
                  />
                </View>
                <View
                  style={[
                    themed($summaryPill),
                    { backgroundColor: colors.statusWarningBackground },
                  ]}
                >
                  <Text
                    text={formatDuration(routeSummary.durationSeconds)}
                    size="xxs"
                    weight="bold"
                    style={{ color: colors.statusWarning }}
                  />
                </View>
              </>
            )}
            {routeError && (
              <View style={[themed($summaryPill), { backgroundColor: colors.palette.angry100 }]}>
                <Text
                  text="Lộ trình dự phòng"
                  size="xxs"
                  weight="bold"
                  style={{ color: colors.error }}
                />
              </View>
            )}
          </View>
        )}

        <ReliefDirectionsMap
          origin={currentLocation}
          destination={destination}
          onRouteReady={(summary) => {
            setRouteSummary(summary)
            setRouteError(null)
          }}
          onRouteError={(message) => {
            setRouteSummary(null)
            setRouteError(message)
          }}
        />

        <Button
          label="Mở bằng Google Maps"
          variant="primary"
          onPress={() => void openDirectionsInGoogleMaps()}
          style={themed($routeActionButton)}
        />
        <Button
          label="Làm mới vị trí"
          variant="outline"
          onPress={() => void requestCurrentLocation()}
          style={themed($routeActionButton)}
        />
      </View>
    )
  }

  if (loading) {
    return (
      <Screen
        preset="fixed"
        contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
        safeAreaEdges={["top", "bottom"]}
      >
        <View style={$centeredState}>
          <Text text="Đang tải chi tiết báo cáo..." size="md" style={{ color: colors.textDim }} />
        </View>
      </Screen>
    )
  }

  if (error || !report) {
    return (
      <Screen
        preset="fixed"
        contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
        safeAreaEdges={["top", "bottom"]}
      >
        <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [themed($backButton), { opacity: pressed ? 0.75 : 1 }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text text="Chi tiết báo cáo" size="md" weight="bold" />
        <View style={$headerSpacer} />
      </View>

      <View style={$centeredState}>
          <Text text={error || "Báo cáo không khả dụng"} size="md" style={themed($errorStateText)} />
          <Button
            label="Thử lại"
            variant="outline"
            onPress={() => void loadReport()}
            style={themed($retryButton)}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [themed($backButton), { opacity: pressed ? 0.75 : 1 }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text text="Chi tiết báo cáo" size="md" weight="bold" />
        <View style={$headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={themed($scrollContent)}
        showsVerticalScrollIndicator={false}
      >
        <View style={themed($heroCard)}>
          <View style={$heroTopRow}>
            <View
              style={[
                themed($statusBadge),
                { backgroundColor: statusColors[report.status] || colors.textDim },
              ]}
            >
              <Text
                text={statusLabels[report.status] || report.status}
                size="xxs"
                weight="bold"
                style={{ color: colors.palette.neutral100 }}
              />
            </View>
            <Text
              text={`Cập nhật ${formatDateTime(report.updated_at)}`}
              size="xxs"
              style={{ color: colors.textTertiary }}
            />
          </View>

          <Text text={report.description} size="lg" weight="bold" style={themed($heroTitle)} />
          <Text text={fullAddress} size="sm" style={themed($heroSubtitle)} />

          {categoryLabels.length > 0 && (
            <View style={themed($chipRow)}>
              {categoryLabels.map((label) => (
                <View key={label} style={themed($chip)}>
                  <Text
                    text={label.toUpperCase()}
                    size="xxs"
                    weight="bold"
                    style={{ color: colors.tint }}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={themed($metaRow)}>
            <View style={themed($metaPill)}>
              <Text
                text={`Báo cáo #${report.id}`}
                size="xxs"
                style={{ color: colors.textSecondary }}
              />
            </View>
            <View style={themed($metaPill)}>
              <Text
                text={`Tạo lúc ${formatDateTime(report.created_at)}`}
                size="xxs"
                style={{ color: colors.textSecondary }}
              />
            </View>
          </View>
        </View>

        <View style={themed($section)}>
          <Text text="Tuyến đường ứng cứu" size="sm" weight="bold" style={themed($sectionTitle)} />
          <Text
            text="Chỉ đường bắt đầu từ vị trí hiện tại của thiết bị và kết thúc tại điểm sự cố được báo."
            size="xs"
            style={themed($sectionSubtitle)}
          />
          <View style={themed($sectionCard)}>{renderRouteSection()}</View>
        </View>

        <View style={themed($section)}>
          <Text text="Thông tin vị trí" size="sm" weight="bold" style={themed($sectionTitle)} />
          <View style={themed($sectionCard)}>
            <View style={themed($infoRow)}>
              <Text text="Địa chỉ" size="xs" style={themed($infoLabel)} />
              <Text text={report.address_line} size="xs" style={themed($infoValue)} />
            </View>
            {report.ward && (
              <View style={themed($infoRow)}>
                <Text text="Phường/Xã" size="xs" style={themed($infoLabel)} />
                <Text text={report.ward} size="xs" style={themed($infoValue)} />
              </View>
            )}
            {report.district && (
              <View style={themed($infoRow)}>
                <Text text="Quận/Huyện" size="xs" style={themed($infoLabel)} />
                <Text text={report.district} size="xs" style={themed($infoValue)} />
              </View>
            )}
            <View style={themed($infoRow)}>
              <Text text="Tỉnh/Thành phố" size="xs" style={themed($infoLabel)} />
              <Text text={report.province} size="xs" style={themed($infoValue)} />
            </View>
            {hasCoordinates(report) && (
              <>
                <View style={themed($infoRow)}>
                  <Text text="Vĩ độ" size="xs" style={themed($infoLabel)} />
                  <Text text={report.latitude.toFixed(6)} size="xs" style={themed($infoValue)} />
                </View>
                <View style={themed($infoRow)}>
                  <Text text="Kinh độ" size="xs" style={themed($infoLabel)} />
                  <Text text={report.longitude.toFixed(6)} size="xs" style={themed($infoValue)} />
                </View>
              </>
            )}
          </View>
        </View>

        <View style={themed($section)}>
          <Text text="Tóm tắt báo cáo" size="sm" weight="bold" style={themed($sectionTitle)} />
          <View style={themed($sectionCard)}>
            <View style={themed($infoRow)}>
              <Text text="Trạng thái" size="xs" style={themed($infoLabel)} />
              <Text
                text={statusLabels[report.status] || report.status}
                size="xs"
                style={themed($infoValue)}
              />
            </View>
            <View style={themed($infoRow)}>
              <Text text="Danh mục" size="xs" style={themed($infoLabel)} />
              <Text
                text={categoryLabels.join(", ") || "Chưa phân loại"}
                size="xs"
                style={themed($infoValue)}
              />
            </View>
            <View style={themed($infoRow)}>
              <Text text="Tạo lúc" size="xs" style={themed($infoLabel)} />
              <Text text={formatDateTime(report.created_at)} size="xs" style={themed($infoValue)} />
            </View>
            <View style={themed($infoRow)}>
              <Text text="Cập nhật lúc" size="xs" style={themed($infoLabel)} />
              <Text text={formatDateTime(report.updated_at)} size="xs" style={themed($infoValue)} />
            </View>
          </View>
        </View>

        {report.created_by && (
          <View style={themed($section)}>
            <Text text="Người báo" size="sm" weight="bold" style={themed($sectionTitle)} />
            <View style={themed($sectionCard)}>
              <View style={themed($infoRow)}>
                <Text text="Họ tên" size="xs" style={themed($infoLabel)} />
                <Text
                  text={`${report.created_by.first_name} ${report.created_by.last_name}`.trim()}
                  size="xs"
                  style={themed($infoValue)}
                />
              </View>
              {report.created_by.phone && (
                <View style={themed($infoRow)}>
                  <Text text="Số điện thoại" size="xs" style={themed($infoLabel)} />
                  <Text text={report.created_by.phone} size="xs" style={themed($infoValue)} />
                </View>
              )}
              {report.created_by.username && (
                <View style={themed($infoRow)}>
                  <Text text="Tên đăng nhập" size="xs" style={themed($infoLabel)} />
                  <Text text={report.created_by.username} size="xs" style={themed($infoValue)} />
                </View>
              )}
            </View>
          </View>
        )}

        {report.images && report.images.length > 0 && (
          <View style={themed($section)}>
            <Text text="Hình ảnh đính kèm" size="sm" weight="bold" style={themed($sectionTitle)} />
            <Text
              text="Hình ảnh minh chứng do người báo cung cấp."
              size="xs"
              style={themed($sectionSubtitle)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={themed($imageRow)}
            >
              {report.images.map((image, index) => (
                <Image key={`${image}-${index}`} source={{ uri: image }} style={$imageCard} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
})

const $headerSpacer: ViewStyle = {
  width: 44,
}

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  gap: spacing.sm,
  paddingBottom: spacing.xl,
})

const $heroCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 18,
  padding: spacing.sm,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 2,
})

const $heroTopRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
})

const $heroTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  marginBottom: spacing.xs,
  lineHeight: 26,
})

const $heroSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textSecondary,
  marginBottom: spacing.sm,
  lineHeight: 20,
})

const $chipRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginBottom: spacing.sm,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.tint,
  backgroundColor: colors.statusInfoBackground,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
})

const $metaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $metaPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $sectionSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textTertiary,
  marginBottom: spacing.xs,
  lineHeight: 18,
})

const $sectionCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  padding: spacing.sm,
  gap: spacing.sm,
})

const $messageCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.palette.neutral100,
  padding: spacing.sm,
  gap: spacing.sm,
})

const $routeContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $routeSummaryRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
})

const $routeActionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
})

const $summaryPill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderRadius: 999,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
})

const $retryButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-start",
})

const $routeActionButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-start",
})

const $infoRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: spacing.sm,
  paddingBottom: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $infoLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  width: 84,
  color: colors.textTertiary,
})

const $infoValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textPrimary,
  textAlign: "right",
  lineHeight: 20,
})

const $imageRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  paddingTop: spacing.xs,
})

const $imageCard: ImageStyle = {
  width: 148,
  height: 112,
  borderRadius: 14,
}

const $centeredState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 24,
  gap: 16,
}

const $errorStateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textAlign: "center",
})
