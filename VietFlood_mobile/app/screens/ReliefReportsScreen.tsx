import { FC, useEffect } from "react"
import { View, ViewStyle, FlatList, Pressable, TextStyle } from "react-native"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useReliefReports } from "@/hooks/useReliefReports"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { UserWithReportCount } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ReliefReportsScreenProps extends AppStackScreenProps<"Reports"> {}

/**
 * ReliefReportsScreen - Shows users who have submitted reports
 * Relief staff taps a user to see their reports
 */
export const ReliefReportsScreen: FC<ReliefReportsScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { loading, error, usersWithReports, fetchUsersWithReports } = useReliefReports()

  useEffect(() => {
    fetchUsersWithReports()
  }, [fetchUsersWithReports])

  const renderUserItem = (item: UserWithReportCount) => (
    <Pressable
      style={({ pressed }) => [
        themed($userCard),
        {
          opacity: pressed ? 0.7 : 1,
          backgroundColor: pressed ? colors.palette.neutral200 : colors.background,
        },
      ]}
      onPress={() => navigation.navigate("ReliefReportsListScreen", { userId: String(item.id) })}
    >
      <View style={$userCardContent}>
        <View style={$userInfo}>
          <Text
            text={`${item.first_name} ${item.last_name}`}
            size="md"
            weight="bold"
            style={{ color: colors.text }}
          />
          <Text
            text={item.phone || "Chưa có số điện thoại"}
            size="xs"
            style={{ color: colors.textDim, marginTop: 4 }}
          />
        </View>
        <View style={[themed($reportBadge), { backgroundColor: colors.statusInfo }]}>
          <Text
            text={`${item.reportCount} báo cáo`}
            size="sm"
            weight="bold"
            style={{ color: colors.palette.neutral100 }}
          />
        </View>
      </View>
    </Pressable>
  )

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Text text="Người dùng có báo cáo" size="lg" weight="bold" />
      </View>

      {error && (
        <View style={[themed($errorContainer), { backgroundColor: colors.error }]}>
          <Text text={error} size="sm" style={{ color: colors.palette.neutral100 }} />
        </View>
      )}

      {loading && usersWithReports.length === 0 ? (
        <View style={$centerContainer}>
          <Text text="Đang tải..." size="md" style={{ color: colors.textDim }} />
        </View>
      ) : usersWithReports.length === 0 ? (
        <View style={$centerContainer}>
          <EmptyState
            icon="🎯"
            title="Chưa có người dùng nào có báo cáo"
            description="Hãy quay lại sau khi người dùng gửi báo cáo"
          />
        </View>
      ) : (
        <FlatList
          data={usersWithReports}
          renderItem={({ item }) => renderUserItem(item)}
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
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  gap: spacing.sm,
})

const $userCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 12,
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: spacing.xs,
})

const $userCardContent: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $userInfo: ViewStyle = {
  flex: 1,
}

const $reportBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 8,
  justifyContent: "center",
  alignItems: "center",
})

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
