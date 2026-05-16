import {
  FC,
  ComponentType,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { FlatList, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { Skeleton } from "boneyard-js/native"
import {
  BoltIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  CubeIcon,
  ExclamationCircleIcon,
  HeartIcon,
  MapIcon,
  UserIcon,
} from "react-native-heroicons/outline"
import Animated, { FadeInDown, FadeInUp, SlideInLeft, ZoomIn } from "react-native-reanimated"

import { Button } from "@/components/Button"
import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { reportService } from "@/services/api/reportService"
import type { Report, ReportStatus } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ReliefScreenProps extends AppStackScreenProps<"Relief"> {}

type ReliefFilter = "all" | "awaiting" | "active" | "resolved" | "route-ready"
type DashboardTone = "info" | "warning" | "success" | "error"

interface MetricCardProps {
  label: string
  value: string
  caption: string
  icon: React.ReactNode
  tone: DashboardTone
  index: number
}

interface FilterChipProps {
  label: string
  count: number
  active: boolean
  onPress: () => void
}

interface StatusPresentation {
  label: string
  tone: DashboardTone
  icon: React.ReactNode
}

const statusPriority: Record<string, number> = {
  "pending": 0,
  "verified": 1,
  "in-progress": 2,
  "rejected": 3,
  "resolved": 4,
  "completed": 4,
}

function isRouteReady(report: Report) {
  return typeof report.latitude === "number" && typeof report.longitude === "number"
}

function isAwaiting(report: Report) {
  return report.status === "pending" || report.status === "verified"
}

function isActive(report: Report) {
  return report.status === "in-progress"
}

function isResolved(report: Report) {
  return report.status === "resolved" || report.status === "completed"
}

function parseReportDate(value?: string) {
  if (!value) return null
  const parsed = new Date(value.replace(" ", "T"))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatQueueTimestamp(value?: string) {
  const parsedDate = parseReportDate(value)
  if (!parsedDate) return "Vừa thêm"

  const diffMs = Date.now() - parsedDate.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} phút trước`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`

  return parsedDate.toLocaleDateString("vi-VN", { month: "short", day: "numeric" })
}

function formatLastSync(value: Date | null) {
  if (!value) return "Chưa đồng bộ"

  return value.toLocaleTimeString("vi-VN", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function getReporterName(report: Report) {
  const firstName = report.created_by?.first_name?.trim()
  const lastName = report.created_by?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

  return (
    fullName ||
    report.created_by?.username?.trim() ||
    report.created_by?.phone?.trim() ||
    "Không có thông tin người báo"
  )
}

function translateCategoryPart(value: string) {
  const normalized = value.trim().toLowerCase()

  if (normalized === "flood") return "Ngập lụt"
  if (normalized === "incident") return "Sự cố"
  if (normalized === "infrastructure") return "Hạ tầng"
  if (normalized === "rescue") return "Cứu hộ"
  return value.trim()
}

function getCategoryLabel(report: Report) {
  if (!report.category?.trim()) return "Chưa phân loại"

  return report.category
    .split(",")
    .map((item) => translateCategoryPart(item))
    .filter(Boolean)
    .join(" · ")
}

function normalizeStatusValue(status: ReportStatus) {
  if (status === "completed") return "resolved"
  return status
}

function MetricCard({ label, value, caption, icon, tone, index }: MetricCardProps) {
  const { themed, theme } = useAppTheme()

  return (
    <Animated.View entering={FadeInUp.delay(index * 70).duration(260)} style={themed($metricCard)}>
      <View
        style={[
          themed($metricIconWrap),
          tone === "warning" && { backgroundColor: theme.colors.statusWarningBackground },
          tone === "success" && { backgroundColor: theme.colors.statusSuccessBackground },
          tone === "error" && { backgroundColor: theme.colors.statusErrorBackground },
          tone === "info" && { backgroundColor: theme.colors.statusInfoBackground },
        ]}
      >
        {icon}
      </View>
      <Text text={label} size="xxs" weight="bold" style={themed($metricLabel)} />
      <Text text={value} size="lg" weight="bold" style={themed($metricValue)} />
      <Text text={caption} size="xxs" style={themed($metricCaption)} />
    </Animated.View>
  )
}

function FilterChip({ label, count, active, onPress }: FilterChipProps) {
  const { themed, theme } = useAppTheme()

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            themed($filterChip),
            active && themed($filterChipActive),
            pressed && themed($filterChipPressed),
          ]}
        >
          <Text
            text={label}
            size="xxs"
            weight="bold"
            style={[themed($filterChipLabel), active && { color: theme.colors.tint }]}
          />
          <View
            style={[
              themed($filterChipCount),
              active && {
                backgroundColor: theme.colors.statusInfoBackground,
                borderColor: `${theme.colors.tint}22`,
              },
            ]}
          >
            <Text
              text={String(count)}
              size="xxxs"
              weight="bold"
              style={[themed($filterChipCountText), active && { color: theme.colors.tint }]}
            />
          </View>
        </View>
      )}
    </Pressable>
  )
}

export const ReliefScreen: FC<ReliefScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { authUserId } = useAuth()

  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [activeFilter, setActiveFilter] = useState<ReliefFilter>("all")
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const fetchReports = useCallback(async (options?: { refresh?: boolean }) => {
    const isPullRefresh = options?.refresh === true

    if (isPullRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const result = await reportService.getAllReports()
      if (result.kind === "ok") {
        setReports(result.data.reports ?? [])
        setLastSyncedAt(new Date())
        return
      }

      const message =
        result.kind === "unauthorized"
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : result.kind === "forbidden"
            ? "Bạn không có quyền xem hàng chờ cứu trợ."
            : "Hiện không thể tải hàng chờ cứu trợ."

      setReports([])
      setError(message)
    } catch (loadError) {
      console.error("[ReliefScreen] Failed to load reports:", loadError)
      setReports([])
      setError("Hiện không thể tải hàng chờ cứu trợ.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  const searchLeftAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function SearchLeftAccessoryComponent(props: TextFieldAccessoryProps) {
        return (
          <View style={[themed($searchAccessory), props.style as ViewStyle]}>
            <MapIcon color={colors.textDim} size={16} />
          </View>
        )
      },
    [colors.textDim, themed],
  )

  const sortedReports = useMemo(() => {
    return [...reports].sort((left, right) => {
      const leftPriority = statusPriority[left.status] ?? 99
      const rightPriority = statusPriority[right.status] ?? 99

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      if (isRouteReady(left) !== isRouteReady(right)) {
        return isRouteReady(left) ? -1 : 1
      }

      const leftDate = parseReportDate(left.created_at)?.getTime() ?? 0
      const rightDate = parseReportDate(right.created_at)?.getTime() ?? 0
      return rightDate - leftDate
    })
  }, [reports])

  const stats = useMemo(
    () => ({
      total: reports.length,
      awaiting: reports.filter(isAwaiting).length,
      active: reports.filter(isActive).length,
      resolved: reports.filter(isResolved).length,
      routeReady: reports.filter(isRouteReady).length,
    }),
    [reports],
  )

  const priorityReport = useMemo(() => {
    return sortedReports.find((report) => isAwaiting(report) || isActive(report)) ?? null
  }, [sortedReports])

  const filteredReports = useMemo(() => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase()

    return sortedReports.filter((report) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "awaiting"
            ? isAwaiting(report)
            : activeFilter === "active"
              ? isActive(report)
              : activeFilter === "resolved"
                ? isResolved(report)
                : isRouteReady(report)

      if (!matchesFilter) return false

      if (!normalizedSearch) return true

      const haystack = [
        report.description,
        report.address_line,
        report.province,
        report.ward,
        getCategoryLabel(report),
        getReporterName(report),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [activeFilter, deferredSearchQuery, sortedReports])

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: "Tất cả", count: stats.total },
      { key: "awaiting" as const, label: "Chờ xử lý", count: stats.awaiting },
      { key: "active" as const, label: "Đang xử lý", count: stats.active },
      { key: "resolved" as const, label: "Đã xử lý", count: stats.resolved },
      { key: "route-ready" as const, label: "Sẵn tuyến đường", count: stats.routeReady },
    ],
    [stats],
  )

  const openReport = useCallback(
    (report: Report) => {
      navigation.navigate("ReliefReportDetailScreen", {
        reportId: String(report.id),
        report,
      })
    },
    [navigation],
  )

  const handleUpdateStatus = useCallback(
    async (reportId: number, newStatus: "in-progress" | "resolved") => {
      if (!authUserId) {
        setError("Tài khoản của bạn chưa có mã người ứng cứu.")
        return
      }

      setUpdatingReportId(reportId)

      try {
        const result = await reportService.updateReportStatus(reportId, authUserId, {
          status: newStatus,
        })

        if (result.kind === "ok") {
          await fetchReports({ refresh: true })
          return
        }

        setError("Không thể cập nhật trạng thái báo cáo này.")
      } catch (statusError) {
        console.error("[ReliefScreen] Failed to update report:", statusError)
        setError("Không thể cập nhật trạng thái báo cáo này.")
      } finally {
        setUpdatingReportId(null)
      }
    },
    [authUserId, fetchReports],
  )

  const getStatusPresentation = useCallback(
    (status: ReportStatus): StatusPresentation => {
      switch (normalizeStatusValue(status)) {
        case "pending":
          return {
            label: "Chờ phân loại",
            tone: "warning",
            icon: <ClockIcon color={colors.statusWarning} size={14} />,
          }
        case "verified":
          return {
            label: "Đã xác minh",
            tone: "info",
            icon: <CheckCircleIcon color={colors.statusInfo} size={14} />,
          }
        case "in-progress":
          return {
            label: "Đã điều phối đội",
            tone: "info",
            icon: <HeartIcon color={colors.statusInfo} size={14} />,
          }
        case "resolved":
          return {
            label: "Đã xử lý",
            tone: "success",
            icon: <CheckCircleIcon color={colors.statusSuccess} size={14} />,
          }
        case "rejected":
          return {
            label: "Bị từ chối",
            tone: "error",
            icon: <ExclamationCircleIcon color={colors.statusError} size={14} />,
          }
        default:
          return {
            label: "Chờ phân loại",
            tone: "warning",
            icon: <ClockIcon color={colors.statusWarning} size={14} />,
          }
      }
    },
    [colors.statusError, colors.statusInfo, colors.statusSuccess, colors.statusWarning],
  )

  const renderStatusPill = useCallback(
    (status: ReportStatus) => {
      const statusPresentation = getStatusPresentation(status)
      const backgroundColor =
        statusPresentation.tone === "warning"
          ? colors.statusWarningBackground
          : statusPresentation.tone === "success"
            ? colors.statusSuccessBackground
            : statusPresentation.tone === "error"
              ? colors.statusErrorBackground
              : colors.statusInfoBackground
      const textColor =
        statusPresentation.tone === "warning"
          ? colors.statusWarning
          : statusPresentation.tone === "success"
            ? colors.statusSuccess
            : statusPresentation.tone === "error"
              ? colors.statusError
              : colors.statusInfo

      return (
        <View
          style={[
            themed($statusPill),
            {
              backgroundColor,
              borderColor: `${textColor}26`,
            },
          ]}
        >
          {statusPresentation.icon}
          <Text
            text={statusPresentation.label}
            size="xxxs"
            weight="bold"
            style={{ color: textColor }}
          />
        </View>
      )
    },
    [
      colors.statusError,
      colors.statusErrorBackground,
      colors.statusInfo,
      colors.statusInfoBackground,
      colors.statusSuccess,
      colors.statusSuccessBackground,
      colors.statusWarning,
      colors.statusWarningBackground,
      getStatusPresentation,
      themed,
    ],
  )

  const renderRoutePill = useCallback(
    (report: Report) => {
      const ready = isRouteReady(report)
      return (
        <View
          style={[
            themed($routePill),
            ready
              ? {
                  backgroundColor: colors.statusSuccessBackground,
                  borderColor: `${colors.success}20`,
                }
              : { backgroundColor: colors.warningBackground, borderColor: `${colors.warning}20` },
          ]}
        >
          <MapIcon color={ready ? colors.success : colors.warning} size={14} />
          <Text
            text={ready ? "Sẵn tuyến đường" : "Cần ghim vị trí"}
            size="xxxs"
            weight="bold"
            style={{ color: ready ? colors.success : colors.warning }}
          />
        </View>
      )
    },
    [
      colors.statusSuccessBackground,
      colors.success,
      colors.warningBackground,
      colors.warning,
      themed,
    ],
  )

  const renderLoadingState = () => (
    <View style={themed($loadingShell)}>
      <View style={themed($heroSkeleton)}>
        <Skeleton loading={true} name="relief-hero">
          <Text text="Điều phối cứu trợ" size="xs" />
          <Text text="Phối hợp đợt ứng cứu tiếp theo" preset="subheading" />
          <Text text="Xem nhanh các điểm có tuyến đường và đội đang hoạt động" size="xs" />
        </Skeleton>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={$metricRailContent}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={themed($metricSkeleton)}>
            <Skeleton loading={true} name={`relief-metric-${index}`}>
              <Text text="Chờ xử lý" size="xxs" />
              <Text text="00" size="lg" weight="bold" />
              <Text text="phân loại" size="xxs" />
            </Skeleton>
          </View>
        ))}
      </ScrollView>

      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={themed($reportSkeletonCard)}>
          <Skeleton loading={true} name={`relief-report-${index}`}>
            <Text text="Chờ phân loại" size="xxs" />
            <Text
              text="Ngập gần khu chợ, đường tiếp cận bị chặn"
              size="sm"
              weight="bold"
            />
            <Text text="Phường/Xã, Quận/Huyện, Tỉnh/Thành phố" size="xs" />
            <Text text="Người báo · 45 phút trước" size="xxs" />
          </Skeleton>
        </View>
      ))}
    </View>
  )

  const renderReportCard = ({ item, index }: { item: Report; index: number }) => {
    const reporterName = getReporterName(item)
    const routeReady = isRouteReady(item)
    const primaryAction = isAwaiting(item)
      ? {
          label: "Nhận xử lý",
          onPress: () => void handleUpdateStatus(item.id, "in-progress"),
        }
      : isActive(item)
        ? {
            label: "Hoàn tất",
            onPress: () => void handleUpdateStatus(item.id, "resolved"),
          }
        : null

    return (
      <Animated.View entering={SlideInLeft.delay(index * 40)} style={themed($reportCardWrap)}>
        <View style={themed($reportCard)}>
          <View style={themed($reportCardTopRow)}>
            <View style={themed($reportBadgeRow)}>
              {renderStatusPill(item.status)}
              {renderRoutePill(item)}
            </View>

            <Pressable
              onPress={() => openReport(item)}
              style={({ pressed }) => [
                themed($openReportButton),
                pressed && { opacity: 0.72, transform: [{ scale: 0.96 }] },
              ]}
            >
              <ChevronRightIcon color={colors.textDim} size={18} />
            </Pressable>
          </View>

          <Text
            text={item.description || "Yêu cầu cứu trợ"}
            size="sm"
            weight="bold"
            numberOfLines={2}
            style={themed($reportTitle)}
          />

          <Text
            text={getCategoryLabel(item)}
            size="xxs"
            weight="bold"
            style={themed($categoryText)}
          />

          <View style={themed($reportMetaStack)}>
            <View style={themed($inlineMeta)}>
              <MapIcon color={colors.textDim} size={14} />
              <Text
                text={[item.address_line, item.ward, item.province].filter(Boolean).join(", ")}
                size="xxs"
                numberOfLines={2}
                style={themed($inlineMetaText)}
              />
            </View>

            <View style={themed($inlineMeta)}>
              <UserIcon color={colors.textDim} size={14} />
              <Text
                text={reporterName}
                size="xxs"
                numberOfLines={1}
                style={themed($inlineMetaText)}
              />
              <View style={themed($metaDivider)} />
              <Text
                text={formatQueueTimestamp(item.created_at)}
                size="xxs"
                style={themed($inlineMetaText)}
              />
            </View>
          </View>

          <View style={themed($cardFooter)}>
            <Button
              label={routeReady ? "Chỉ đường" : "Xem chi tiết"}
              variant="outline"
              size="sm"
              style={themed($secondaryActionButton)}
              onPress={() => openReport(item)}
            />

            {primaryAction ? (
              <Button
                label={primaryAction.label}
                variant="primary"
                size="sm"
                style={themed($primaryActionButton)}
                onPress={primaryAction.onPress}
                isLoading={updatingReportId === item.id}
              />
            ) : (
              <Button
                label={routeReady ? "Mở tuyến đường" : "Mở"}
                variant="primary"
                size="sm"
                style={themed($primaryActionButton)}
                onPress={() => openReport(item)}
              />
            )}
          </View>
        </View>
      </Animated.View>
    )
  }

  if (isLoading && reports.length === 0) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={$screen}>
        <View style={themed($screenBackground)}>{renderLoadingState()}</View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={$screen}>
      <View style={themed($screenBackground)}>
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReportCard}
          refreshing={isRefreshing}
          onRefresh={() => void fetchReports({ refresh: true })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={themed($listContent)}
          ListHeaderComponent={
            <>
              <Animated.View entering={FadeInDown.duration(320)} style={themed($heroCard)}>
                <View style={themed($heroGlowPrimary)} />
                <View style={themed($heroGlowSecondary)} />

                <View style={themed($heroTopRow)}>
                  <View style={themed($heroCopyWrap)}>
                    <View style={themed($heroEyebrowRow)}>
                      <View style={themed($heroBadge)}>
                        <HeartIcon color={colors.tint} size={14} />
                      <Text
                          text="Điều phối cứu trợ"
                          size="xxxs"
                          weight="bold"
                          style={themed($heroBadgeText)}
                        />
                      </View>
                      <Text
                        text={`Đồng bộ ${formatLastSync(lastSyncedAt)}`}
                        size="xxxs"
                        style={themed($heroSyncText)}
                      />
                    </View>

                    <Text
                      text="Phối hợp đợt ứng cứu tiếp theo"
                      preset="subheading"
                      style={themed($heroTitle)}
                    />
                    <Text
                      text={`${stats.awaiting} điểm chờ phân loại, ${stats.routeReady} điểm sẵn tuyến đường, ${stats.active} đội đang hoạt động.`}
                      size="xs"
                      style={themed($heroSubtitle)}
                    />
                  </View>

                  <Pressable
                    onPress={() => void fetchReports({ refresh: true })}
                    style={({ pressed }) => [
                      themed($refreshButton),
                      pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <BoltIcon color={colors.textPrimary} size={18} />
                  </Pressable>
                </View>

                <View style={themed($heroMetricsRow)}>
                  <View style={themed($heroMetric)}>
                    <Text
                      text="Chờ xử lý"
                      size="xxxs"
                      weight="bold"
                      style={themed($heroMetricLabel)}
                    />
                    <Text
                      text={String(stats.awaiting)}
                      size="lg"
                      weight="bold"
                      style={themed($heroMetricValue)}
                    />
                  </View>
                  <View style={themed($heroMetricDivider)} />
                  <View style={themed($heroMetric)}>
                    <Text
                      text="Sẵn tuyến đường"
                      size="xxxs"
                      weight="bold"
                      style={themed($heroMetricLabel)}
                    />
                    <Text
                      text={String(stats.routeReady)}
                      size="lg"
                      weight="bold"
                      style={themed($heroMetricValue)}
                    />
                  </View>
                </View>

                {priorityReport && (
                  <Pressable
                    onPress={() => openReport(priorityReport)}
                    style={({ pressed }) => [themed($priorityStrip), pressed && { opacity: 0.86 }]}
                  >
                    <View style={themed($priorityIconWrap)}>
                      <ExclamationCircleIcon color={colors.cta} size={18} />
                    </View>
                    <View style={themed($priorityCopy)}>
                      <Text
                        text="Ưu tiên tiếp theo"
                        size="xxxs"
                        weight="bold"
                        style={themed($priorityLabel)}
                      />
                      <Text
                        text={priorityReport.description || "Báo cáo cứu trợ mới"}
                        size="xs"
                        weight="bold"
                        numberOfLines={1}
                        style={themed($priorityTitle)}
                      />
                      <Text
                        text={[priorityReport.address_line, priorityReport.province]
                          .filter(Boolean)
                          .join(", ")}
                        size="xxxs"
                        numberOfLines={1}
                        style={themed($priorityAddress)}
                      />
                    </View>
                    <ChevronRightIcon color={colors.textPrimary} size={18} />
                  </Pressable>
                )}
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(60).duration(280)}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={$metricRailContent}
                  style={$metricRail}
                >
                  <MetricCard
                    label="Chờ điều phối"
                    value={String(stats.awaiting)}
                    caption="Cần phân loại hoặc phân công"
                    icon={<ClockIcon color={colors.statusWarning} size={20} />}
                    tone="warning"
                    index={0}
                  />
                  <MetricCard
                    label="Đội đang hoạt động"
                    value={String(stats.active)}
                    caption="Lực lượng đang ở hiện trường"
                    icon={<HeartIcon color={colors.statusInfo} size={20} />}
                    tone="info"
                    index={1}
                  />
                  <MetricCard
                    label="Sẵn tuyến đường"
                    value={String(stats.routeReady)}
                    caption="Báo cáo có tọa độ bản đồ"
                    icon={<MapIcon color={colors.statusSuccess} size={20} />}
                    tone="success"
                    index={2}
                  />
                  <MetricCard
                    label="Đã khép vòng"
                    value={String(stats.resolved)}
                    caption="Ca ứng cứu đã hoàn tất"
                    icon={<CubeIcon color={colors.textPrimary} size={20} />}
                    tone="info"
                    index={3}
                  />
                </ScrollView>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(100).duration(280)}
                style={themed($searchSection)}
              >
                <Text
                  text="Tìm ca ứng cứu tiếp theo"
                  size="xxs"
                  weight="bold"
                  style={themed($sectionEyebrow)}
                />
                <TextField
                  placeholder="Tìm theo địa chỉ, danh mục hoặc người báo"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  containerStyle={themed($searchFieldContainer)}
                  inputWrapperStyle={themed($searchFieldWrapper)}
                  style={themed($searchFieldInput)}
                  LeftAccessory={searchLeftAccessory}
                />
              </Animated.View>

              {error && (
                <Animated.View entering={ZoomIn.springify()} style={themed($errorBanner)}>
                  <View style={themed($errorIconWrap)}>
                    <ExclamationCircleIcon color={colors.error} size={18} />
                  </View>
                  <View style={themed($errorCopy)}>
                    <Text
                      text="Hàng chờ không khả dụng"
                      size="xxs"
                      weight="bold"
                      style={themed($errorTitle)}
                    />
                    <Text text={error} size="xxs" style={themed($errorText)} />
                  </View>
                  <Button
                    label="Thử lại"
                    variant="outline"
                    size="sm"
                    onPress={() => void fetchReports()}
                  />
                </Animated.View>
              )}

              <Animated.View
                entering={FadeInUp.delay(120).duration(280)}
                style={themed($filtersSection)}
              >
                <View style={themed($sectionHeaderRow)}>
                  <View>
                    <Text text="Hàng chờ trực tiếp" size="sm" weight="bold" style={themed($sectionTitle)} />
                    <Text
                      text={`${filteredReports.length} báo cáo đang hiển thị${activeFilter !== "all" ? " trong bộ lọc này" : ""}.`}
                      size="xxs"
                      style={themed($sectionDescription)}
                    />
                  </View>
                  <Text
                    text={activeFilter === "route-ready" ? "Chế độ tuyến đường" : "Chế độ vận hành"}
                    size="xxxs"
                    weight="bold"
                    style={themed($sectionBadge)}
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={themed($filtersRow)}
                >
                  {filterOptions.map((filter) => (
                    <FilterChip
                      key={filter.key}
                      label={filter.label}
                      count={filter.count}
                      active={activeFilter === filter.key}
                      onPress={() => setActiveFilter(filter.key)}
                    />
                  ))}
                </ScrollView>
              </Animated.View>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <Animated.View entering={ZoomIn.springify()} style={themed($emptyWrap)}>
                <EmptyState
                  title={reports.length === 0 ? "Hiện chưa có yêu cầu mới" : "Không có báo cáo phù hợp"}
                  description={
                    reports.length === 0
                      ? "Các yêu cầu cứu trợ mới sẽ xuất hiện tại đây ngay khi hệ thống cập nhật."
                      : "Hãy đổi bộ lọc hoặc mở rộng từ khóa tìm kiếm để xem thêm báo cáo."
                  }
                  actionLabel={reports.length === 0 ? "Làm mới" : "Hiển thị tất cả"}
                  onAction={() => {
                    if (reports.length === 0) {
                      void fetchReports({ refresh: true })
                    } else {
                      setActiveFilter("all")
                      setSearchQuery("")
                    }
                  }}
                />
              </Animated.View>
            ) : null
          }
        />
      </View>
    </Screen>
  )
}

const $screen: ViewStyle = {
  flex: 1,
}

const $screenBackground: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xl,
})

const $heroCard: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.md,
  backgroundColor: isDark ? colors.palette.neutral800 : colors.palette.neutral100,
  borderWidth: 1,
  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(37,99,235,0.12)",
  shadowColor: isDark ? colors.palette.neutral100 : colors.tint,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: isDark ? 0.08 : 0.12,
  shadowRadius: 24,
  elevation: 3,
})

const $heroGlowPrimary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: 999,
  backgroundColor: colors.statusInfoBackground,
  top: -120,
  right: -80,
})

const $heroGlowSecondary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 180,
  height: 180,
  borderRadius: 999,
  backgroundColor: colors.warningBackground,
  bottom: -110,
  left: -60,
})

const $heroTopRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $heroCopyWrap: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $heroEyebrowRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.sm,
  gap: spacing.sm,
})

const $heroBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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

const $heroBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $heroSyncText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textTertiary,
})

const $refreshButton: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.palette.overlay10,
  borderWidth: 1,
  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
  marginTop: spacing.xs,
})

const $heroTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  marginBottom: spacing.xs,
  lineHeight: 30,
})

const $heroSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $heroMetricsRow: ThemedStyle<ViewStyle> = ({ spacing, colors, isDark }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  borderRadius: 16,
  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
  borderWidth: 1,
  borderColor: colors.border,
})

const $heroMetric: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $heroMetricLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textTertiary,
  marginBottom: 2,
})

const $heroMetricValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $heroMetricDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 1,
  alignSelf: "stretch",
  backgroundColor: colors.border,
  marginHorizontal: 16,
})

const $priorityStrip: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  marginTop: spacing.sm,
  borderRadius: 16,
  padding: spacing.sm,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)",
  borderWidth: 1,
  borderColor: colors.border,
})

const $priorityIconWrap: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 34,
  height: 34,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.warningBackground,
})

const $priorityCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $priorityLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textTertiary,
  marginBottom: 2,
})

const $priorityTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $priorityAddress: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
  marginTop: 2,
})

const $metricRail: ViewStyle = {
  marginBottom: 16,
}

const $metricRailContent: ViewStyle = {
  paddingRight: 8,
  gap: 12,
}

const $metricCard: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  width: 148,
  borderRadius: 16,
  padding: spacing.sm,
  backgroundColor: isDark ? colors.palette.neutral800 : colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: isDark ? colors.palette.neutral100 : colors.palette.neutral900,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: isDark ? 0.04 : 0.06,
  shadowRadius: 16,
  elevation: 2,
})

const $metricIconWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.xs,
})

const $metricLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textTertiary,
})

const $metricValue: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  marginTop: spacing.xxs,
})

const $metricCaption: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textSecondary,
  marginTop: spacing.xxs,
})

const $searchSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $sectionEyebrow: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textTertiary,
  marginBottom: spacing.xs,
})

const $searchFieldContainer: ThemedStyle<ViewStyle> = () => ({
  gap: 0,
})

const $searchFieldWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  minHeight: 48,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  backgroundColor: isDark ? colors.palette.neutral800 : colors.palette.neutral100,
  borderColor: colors.border,
  borderWidth: 1,
  shadowColor: isDark ? colors.palette.neutral100 : colors.tint,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: isDark ? 0.03 : 0.06,
  shadowRadius: 16,
  elevation: 1,
})

const $searchFieldInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontSize: 15,
  backgroundColor: "transparent",
})

const $searchAccessory: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
  justifyContent: "center",
  alignItems: "center",
})

const $errorBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  padding: spacing.sm,
  marginBottom: spacing.md,
  borderRadius: 16,
  backgroundColor: colors.errorBackground,
  borderWidth: 1,
  borderColor: `${colors.error}18`,
})

const $errorIconWrap: ThemedStyle<ViewStyle> = () => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.45)",
})

const $errorCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $errorTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginBottom: 2,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $filtersSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $sectionHeaderRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $sectionDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textTertiary,
  marginTop: spacing.xxs,
})

const $sectionBadge: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  backgroundColor: colors.statusInfoBackground,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  overflow: "hidden",
})

const $filtersRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  paddingRight: spacing.sm,
})

const $filterChip: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingLeft: spacing.sm,
  paddingRight: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  backgroundColor: isDark ? colors.palette.neutral800 : colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.border,
})

const $filterChipActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: `${colors.tint}30`,
  backgroundColor: colors.statusInfoBackground,
})

const $filterChipPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.84,
})

const $filterChipLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $filterChipCount: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minWidth: 24,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 6,
  paddingVertical: 4,
  borderRadius: 999,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
})

const $filterChipCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textTertiary,
})

const $reportCardWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $reportCard: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  borderRadius: 18,
  padding: spacing.sm,
  backgroundColor: isDark ? colors.palette.neutral800 : colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: isDark ? colors.palette.neutral100 : colors.palette.neutral900,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: isDark ? 0.04 : 0.06,
  shadowRadius: 18,
  elevation: 2,
})

const $reportCardTopRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.sm,
  marginBottom: spacing.xs,
})

const $reportBadgeRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $openReportButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
})

const $statusPill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
})

const $routePill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
})

const $reportTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $categoryText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginTop: spacing.xxs,
  marginBottom: spacing.xs,
})

const $reportMetaStack: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $inlineMeta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
})

const $inlineMetaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flexShrink: 1,
  color: colors.textSecondary,
})

const $metaDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 4,
  height: 4,
  borderRadius: 999,
  backgroundColor: colors.textQuaternary,
})

const $cardFooter: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.sm,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
})

const $secondaryActionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $primaryActionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $loadingShell: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xl,
})

const $heroSkeleton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.md,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.border,
})

const $metricSkeleton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 148,
  borderRadius: 16,
  padding: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.border,
})

const $reportSkeletonCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 18,
  padding: spacing.sm,
  marginBottom: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.border,
})

const $emptyWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})
