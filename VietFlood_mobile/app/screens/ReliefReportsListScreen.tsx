import { FC, useEffect } from "react"
import { View, ViewStyle, FlatList, Pressable } from "react-native"
import { ArrowLeftIcon } from "react-native-heroicons/outline"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useReliefReports } from "@/hooks/useReliefReports"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { Report } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ReliefReportsListScreenProps extends AppStackScreenProps<"ReliefReportsListScreen"> {}

const statusColors: Record<string, string> = {
  "pending": "#EAB308",
  "in-progress": "#3B82F6",
  "resolved": "#10B981",
  "rejected": "#EF4444",
}

const statusLabels: Record<string, string> = {
  "pending": "Chờ xử lý",
  "in-progress": "Đang xử lý",
  "resolved": "Đã xử lý",
  "rejected": "Đã từ chối",
}

/**
 * ReliefReportsListScreen - Shows reports from selected user
 * Relief staff can tap a report to see detailed information
 */
export const ReliefReportsListScreen: FC<ReliefReportsListScreenProps> = ({
  navigation,
  route,
}) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { loading, error, userReports, fetchUserReports, clearSelection } = useReliefReports()
  const userId = route.params.userId
  const userName = route.params.userName || `Người dùng #${userId}`

  useEffect(() => {
    fetchUserReports(parseInt(userId, 10))
  }, [userId, fetchUserReports])

  const handleBack = () => {
    clearSelection()
    navigation.goBack()
  }

  const getStatusColor = (status: string): string => {
    return statusColors[status] || colors.textDim
  }

  const renderReportItem = (item: Report) => (
    <Pressable
      style={({ pressed }) => [
        themed($reportCard),
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => navigation.navigate("ReliefReportDetailScreen", { reportId: String(item.id) })}
    >
      <View style={$reportCardHeader}>
        <View style={$reportInfo}>
          <Text
            text={item.category.toUpperCase()}
            size="sm"
            weight="bold"
            style={{ color: colors.text }}
          />
          <Text
            text={item.description.substring(0, 50) + (item.description.length > 50 ? "..." : "")}
            size="xs"
            numberOfLines={2}
            style={{ color: colors.textDim, marginTop: 4 }}
          />
        </View>
        <View style={[themed($statusBadge), { backgroundColor: getStatusColor(item.status) }]}>
          <Text
            text={statusLabels[item.status] || item.status}
            size="xs"
            weight="bold"
            style={{ color: colors.palette.neutral100 }}
          />
        </View>
      </View>
      <View style={$reportCardFooter}>
        <Text
          text={item.address_line}
          size="xs"
          style={{ color: colors.textDim }}
          numberOfLines={1}
        />
        <Text
          text={new Date(item.created_at).toLocaleDateString("vi-VN")}
          size="xs"
          style={{ color: colors.textDim }}
        />
      </View>
    </Pressable>
  )

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header with back button */}
      <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            themed($backButton),
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={handleBack}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={$headerTitle}>
          <Text text="Báo cáo từ" size="xs" style={{ color: colors.textDim }} />
          <Text text={userName} size="md" weight="bold" />
        </View>
        <View style={{ width: 44 }} />
      </View>

      {error && (
        <View style={[themed($errorContainer), { backgroundColor: colors.error }]}>
          <Text text={error} size="sm" style={{ color: colors.palette.neutral100 }} />
        </View>
      )}

      {loading && userReports.length === 0 ? (
        <View style={$centerContainer}>
          <Text text="Đang tải báo cáo..." size="md" style={{ color: colors.textDim }} />
        </View>
      ) : userReports.length === 0 ? (
        <View style={$centerContainer}>
          <EmptyState
            icon="📄"
            title="Chưa có báo cáo nào"
            description="Người dùng này chưa gửi báo cáo"
          />
        </View>
      ) : (
        <FlatList
          data={userReports}
          renderItem={({ item }) => renderReportItem(item)}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={themed($listContent)}
          scrollEnabled={true}
        />
      )}
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

const $headerTitle: ViewStyle = {
  flex: 1,
  marginLeft: 8,
}

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  gap: spacing.sm,
})

const $reportCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 12,
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
})

const $reportCardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 8,
}

const $reportInfo: ViewStyle = {
  flex: 1,
  marginRight: 8,
}

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
  justifyContent: "center",
  alignItems: "center",
})

const $reportCardFooter: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 8,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: "rgba(0, 0, 0, 0.1)",
}

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  marginHorizontal: spacing.sm,
  marginVertical: spacing.sm,
  borderRadius: 8,
})

const $centerContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}
