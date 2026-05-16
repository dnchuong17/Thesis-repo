import { FC, useMemo, useCallback } from "react"
import { View, ViewStyle, FlatList } from "react-native"
import {
  DocumentTextIcon,
  ClockIcon,
  MapIcon,
  UsersIcon,
  PhoneIcon,
} from "react-native-heroicons/outline"
import {
  ExclamationTriangleIcon,
  ChevronDoubleUpIcon,
  ChevronUpIcon,
  MinusIcon,
} from "react-native-heroicons/solid"
import Animated, { FadeIn, SlideInLeft, ZoomIn } from "react-native-reanimated"

import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { LoadingSkeleton } from "@/components/LoadingSkeleton"
import { RoleBasedLayout } from "@/components/RoleBasedLayout"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Avatar, AvatarImage, AvatarFallback, Progress } from "@/components/ui"
import { useAsyncFetch } from "@/hooks/useAsyncFetch"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface VolunteerScreenProps extends AppStackScreenProps<"Volunteer"> {}

interface VolunteerAssignment {
  id: string
  volunteerName: string
  taskType: string
  location: string
  priority: "urgent" | "high" | "medium" | "low"
  deadline: string
  description: string
  status: "assigned" | "in_progress" | "completed"
}

// Mock data for volunteer assignments
const MOCK_ASSIGNMENTS: VolunteerAssignment[] = [
  {
    id: "1",
    volunteerName: "Nguyễn Văn A",
    taskType: "Phân phát nước uống",
    location: "Quận 1, TP.HCM",
    priority: "urgent",
    deadline: "2026-04-18",
    description: "Phân phát nước uống đến điểm trú ẩn ngập lụt A",
    status: "assigned",
  },
  {
    id: "2",
    volunteerName: "Trần Thị B",
    taskType: "Hỗ trợ y tế",
    location: "Quận 2, TP.HCM",
    priority: "high",
    deadline: "2026-04-19",
    description: "Sơ cứu tại phòng khám cộng đồng",
    status: "in_progress",
  },
  {
    id: "3",
    volunteerName: "Lê Văn C",
    taskType: "Phân phát thực phẩm",
    location: "Quận 4, TP.HCM",
    priority: "medium",
    deadline: "2026-04-20",
    description: "Sắp xếp và phát các gói thực phẩm",
    status: "assigned",
  },
]

async function fetchAssignments(): Promise<VolunteerAssignment[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_ASSIGNMENTS), 1200))
}

export const VolunteerScreen: FC<VolunteerScreenProps> = () => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { state, data, error, retry } = useAsyncFetch<VolunteerAssignment[]>(fetchAssignments)

  // Calculate summary statistics
  const stats = useMemo(
    () => ({
      total: data?.length || 0,
      assigned: data?.filter((a) => a.status === "assigned").length || 0,
      inProgress: data?.filter((a) => a.status === "in_progress").length || 0,
      urgent: data?.filter((a) => a.priority === "urgent").length || 0,
    }),
    [data],
  )

  const getPriorityColor = useCallback(
    (priority: string) => {
      switch (priority) {
        case "urgent":
          return colors.error
        case "high":
          return colors.statusWarning
        case "medium":
          return colors.statusInfo
        case "low":
          return colors.statusSuccess
        default:
          return colors.textTertiary
      }
    },
    [colors],
  )

  const getStatusColor = useCallback(
    (status: string) => {
      switch (status) {
        case "completed":
          return colors.statusSuccess
        case "in_progress":
          return colors.statusInfo
        case "assigned":
          return colors.statusWarning
        default:
          return colors.textTertiary
      }
    },
    [colors],
  )

  const getPriorityIcon = useCallback((priority: string, color: string) => {
    switch (priority) {
      case "urgent":
        return <ExclamationTriangleIcon color={color} size={14} />
      case "high":
        return <ChevronDoubleUpIcon color={color} size={14} />
      case "medium":
        return <ChevronUpIcon color={color} size={14} />
      case "low":
        return <MinusIcon color={color} size={14} />
      default:
        return null
    }
  }, [])

  const calculateProgress = (status: string) => {
    if (status === "completed") return 100
    if (status === "in_progress") return 50
    return 10
  }

  const getPriorityLabel = useCallback((priority: VolunteerAssignment["priority"]) => {
    switch (priority) {
      case "urgent":
        return "Khẩn cấp"
      case "high":
        return "Cao"
      case "medium":
        return "Trung bình"
      case "low":
        return "Thấp"
      default:
        return priority
    }
  }, [])

  const getStatusLabel = useCallback((status: VolunteerAssignment["status"]) => {
    switch (status) {
      case "assigned":
        return "Đã phân công"
      case "in_progress":
        return "Đang thực hiện"
      case "completed":
        return "Hoàn thành"
      default:
        return status
    }
  }, [])

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={$screenContainer}
    >
      <RoleBasedLayout
        roleIcon={<DocumentTextIcon color={colors.statusInfo} size={24} />}
        actionButtons={<Button label="+ Phân công tình nguyện viên" variant="primary" style={$addButton} />}
      >
        <FlatList
          data={state === "success" ? data : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={themed($listContainer)}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Summary Stats */}
              {state === "success" && data && (
                <Animated.View style={themed($summaryGrid)} entering={ZoomIn.springify()}>
                  <SummaryCard
                    icon={<UsersIcon color={colors.statusInfo} size={20} />}
                    label="Tổng phân công"
                    value={`${stats.total}`}
                    color={colors.statusInfo}
                  />
                  <SummaryCard
                    icon={<DocumentTextIcon color={colors.statusWarning} size={20} />}
                    label="Chờ nhận việc"
                    value={`${stats.assigned}`}
                    color={colors.statusWarning}
                  />
                  <SummaryCard
                    icon={<ClockIcon color={colors.statusInfo} size={20} />}
                    label="Đang thực hiện"
                    value={`${stats.inProgress}`}
                    color={colors.statusInfo}
                  />
                  <SummaryCard
                    icon={<MapIcon color={colors.error} size={20} />}
                    label="Khẩn cấp"
                    value={`${stats.urgent}`}
                    color={colors.error}
                  />
                </Animated.View>
              )}

              {/* Loading state with enhanced skeleton */}
              {state === "loading" && (
                <Animated.View entering={SlideInLeft}>
                  <LoadingSkeleton
                    shape="list-item"
                    count={3}
                    loadingText="Đang tải danh sách phân công tình nguyện viên..."
                  />
                </Animated.View>
              )}
            </>
          }
          ListEmptyComponent={
            state === "success" && data?.length === 0 ? (
              <Animated.View entering={ZoomIn}>
                <EmptyState
                  icon={<DocumentTextIcon size={64} color={colors.textTertiary} />}
                  title="Chưa có phân công"
                  description="Tất cả tình nguyện viên đã hoàn thành nhiệm vụ. Làm tốt lắm!"
                  actionLabel="Phân công mới"
                  onAction={() => __DEV__ && console.log("TODO: Navigate to create assignment")}
                />
              </Animated.View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={SlideInLeft.delay(index * 50)}>
              <Card
                style={themed($assignmentCard)}
                heading={item.taskType}
                ContentComponent={
                  <View style={themed($cardContent)}>
                    {/* Header Row: Volunteer Info & Priority */}
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-center">
                        <Avatar alt={item.volunteerName} className="h-10 w-10 mr-3">
                          <AvatarImage
                            source={{
                              uri: `https://api.dicebear.com/7.x/identicon/png?seed=${item.volunteerName.replace(/\s+/g, "")}`,
                            }}
                          />
                          <AvatarFallback>
                            <Text className="font-bold">{item.volunteerName.charAt(0)}</Text>
                          </AvatarFallback>
                        </Avatar>
                        <View>
                          <Text size="sm" weight="bold" text={item.volunteerName} />
                          <View className="flex-row items-center mt-1">
                            <PhoneIcon size={12} color={colors.textTertiary} />
                            <Text
                              size="xs"
                              text="Thông tin liên hệ"
                              style={{ color: colors.textTertiary, marginLeft: 4 }}
                            />
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          themed($priorityBadge),
                          {
                            backgroundColor: `${getPriorityColor(item.priority)}15`,
                            borderColor: getPriorityColor(item.priority),
                          },
                        ]}
                        className="flex-row items-center gap-1 border"
                      >
                        {getPriorityIcon(item.priority, getPriorityColor(item.priority))}
                        <Text
                          size="xs"
                          weight="bold"
                          text={getPriorityLabel(item.priority)}
                          style={{ color: getPriorityColor(item.priority) }}
                        />
                      </View>
                    </View>

                    {/* Metadata Grid */}
                    <View className="flex-row flex-wrap mt-4 gap-4">
                      <View className="flex-row items-center">
                        <MapIcon size={14} color={colors.textTertiary} />
                        <Text
                          size="xs"
                          text={item.location}
                          style={{ color: colors.textTertiary, marginLeft: 6 }}
                        />
                      </View>
                      <View className="flex-row items-center">
                        <ClockIcon size={14} color={colors.textTertiary} />
                        <Text
                          size="xs"
                          text={`Hạn: ${new Date(item.deadline).toLocaleDateString("vi-VN")}`}
                          style={{ color: colors.error, marginLeft: 6 }}
                        />
                      </View>
                    </View>

                    {/* Description */}
                    <Text
                      size="sm"
                      text={item.description}
                      style={{ color: colors.textTertiary, marginTop: 12 }}
                    />

                    {/* Progress Indicator */}
                    <View className="mt-4 gap-2">
                      <View className="flex-row justify-between items-center">
                        <Text
                          size="xs"
                          text="Tiến độ nhiệm vụ"
                          style={{ color: colors.textTertiary }}
                        />
                        <Text
                          size="xs"
                          weight="bold"
                          text={`${calculateProgress(item.status)}%`}
                          style={{ color: getStatusColor(item.status) }}
                        />
                      </View>
                      <Progress value={calculateProgress(item.status)} className="h-2" />
                    </View>

                    {/* Footer Row: Status & Actions */}
                    <View className="flex-row justify-between items-center mt-4 border-t border-border pt-4">
                      <View
                        style={[
                          themed($statusBadge),
                          {
                            backgroundColor: `${getStatusColor(item.status)}15`,
                            borderColor: getStatusColor(item.status),
                          },
                        ]}
                      >
                        <Text
                          size="xs"
                          weight="bold"
                          text={getStatusLabel(item.status)}
                          style={{ color: getStatusColor(item.status) }}
                        />
                      </View>

                      <View className="flex-row gap-2">
                        {item.status !== "completed" && (
                          <Button variant="outline" size="sm" label="Phân công lại" />
                        )}
                        {item.status === "assigned" && (
                          <Button variant="primary" size="sm" label="Nhận việc" />
                        )}
                        {item.status === "in_progress" && (
                          <Button variant="primary" size="sm" label="Hoàn tất" />
                        )}
                      </View>
                    </View>
                  </View>
                }
              />
            </Animated.View>
          )}
        />

        {/* Empty state (No data at all) */}
        {state === "empty" && (
          <Animated.View entering={ZoomIn}>
            <EmptyState
              icon={<DocumentTextIcon size={64} color={colors.textTertiary} />}
              title="Không có dữ liệu phân công"
              description="Không tìm thấy phân công tình nguyện viên nào."
              actionLabel="Thử lại"
              onAction={() => retry()}
            />
          </Animated.View>
        )}

        {/* Error state */}
        {state === "error" && (
          <Animated.View entering={ZoomIn}>
            <EmptyState
              icon={<DocumentTextIcon size={64} color={colors.error} />}
              title="Không tải được phân công"
              description={error || "Không thể tải danh sách phân công tình nguyện viên. Vui lòng thử lại."}
              actionLabel="Thử lại"
              onAction={() => retry()}
            />
          </Animated.View>
        )}
      </RoleBasedLayout>
    </Screen>
  )
}

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  const { themed } = useAppTheme()

  return (
    <View style={[themed($summaryCard), { borderLeftColor: color }]}>
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text size="xs" text={label} style={themed($summaryLabel)} />
      <Text size="lg" weight="bold" text={value} style={[themed($summaryValue), { color }]} />
    </View>
  )
}

const $screenContainer: ViewStyle = {
  flex: 1,
}

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
})

const $summaryGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  marginBottom: spacing.md,
  justifyContent: "space-between",
})

const $summaryCard: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: "48%",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  marginBottom: spacing.sm,
  backgroundColor: colors.background,
  borderRadius: 12,
  borderLeftWidth: 4,
  borderColor: colors.border,
})

const $summaryLabel: ThemedStyle<ViewStyle> = ({ colors }) => ({
  color: colors.textTertiary,
  marginTop: 4,
})

const $summaryValue: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xxs,
})

const $addButton: ViewStyle = {
  alignSelf: "flex-end",
}

const $assignmentCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $cardContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
})

const $cardRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}

const $priorityBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
})

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
  borderWidth: 1,
  alignSelf: "flex-start",
})
