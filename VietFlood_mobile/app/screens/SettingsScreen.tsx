import { FC, useCallback, useEffect, useMemo } from "react"
import { View, ViewStyle, TextStyle, Image, ImageStyle, Pressable } from "react-native"
import { Skeleton } from "boneyard-js/native"
import {
  BellIcon,
  CheckBadgeIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  MapIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "react-native-heroicons/outline"
import Animated, { FadeInDown } from "react-native-reanimated"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { adaptOverviewData, OverviewViewModel } from "@/features/profile-home/overviewAdapter"
import { useAsyncFetch } from "@/hooks/useAsyncFetch"
import { useProfile } from "@/hooks/useProfile"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { reportService } from "@/services/api/reportService"
import { userService } from "@/services/api/userService"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { appToast } from "@/utils/toast"

interface ProductCardProps {
  label: string
  value: string | number
  icon?: React.ElementType
  isDark: boolean
  style?: ViewStyle
  colors: any
}

const ProductCard: FC<ProductCardProps> = ({
  label,
  value,
  icon: IconComponent,
  isDark,
  style,
  colors,
}) => {
  const cardBg = isDark ? colors.palette.neutral800 : colors.palette.neutral100
  const fgColor = isDark ? colors.palette.neutral100 : colors.palette.neutral900
  const secondaryColor = isDark ? colors.palette.neutral400 : colors.palette.neutral600

  return (
    <View style={[$productCardContainer, { backgroundColor: cardBg }, style]}>
      <View style={$productCardHeader}>
        {IconComponent && <IconComponent color={fgColor} size={18} />}
        <Text text={label} style={[$productCardHeaderText, { color: secondaryColor }]} />
      </View>
      <Text text={String(value)} style={[$productCardValue, { color: fgColor }]} />
    </View>
  )
}

interface InfoRowProps {
  icon: React.ComponentType<any>
  label: string
  value: string | undefined
  colors: any
}

const InfoRow: FC<InfoRowProps> = ({ icon: IconComponent, label, value, colors }) => {
  return (
    <View style={$infoRow}>
      <View style={[$profileIconWrapper, { backgroundColor: colors.tint + "1A" }]}>
        <IconComponent size={20} color={colors.tint} strokeWidth={2} />
      </View>
      <View style={$infoContent}>
        <Text text={label} size="xs" style={{ color: colors.textDim }} />
        <Text text={value || "Chưa cung cấp"} size="sm" style={{ marginTop: 2 }} />
      </View>
    </View>
  )
}

interface SettingsScreenProps extends AppStackScreenProps<"Settings"> {}

export const SettingsScreen: FC<SettingsScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { isDark, colors },
  } = useAppTheme()
  const { authRole, authUsername, logout } = useAuth()
  const { user, loading: profileLoading, error: profileError, fetchProfile } = useProfile()
  const isUserRole = authRole === "user" || authRole === "resident"
  const fetchOverviewData = useCallback(async (): Promise<OverviewViewModel | null> => {
    try {
      let totalReports = 0
      let pendingReports = 0
      let completedReports = 0
      let totalUsers = 0

      if (isUserRole) {
        const reportsResult = await reportService.getUserReports()

        if (reportsResult.kind === "ok") {
          totalReports = reportsResult.data.length
          pendingReports = reportsResult.data.filter((report) => report.status === "pending").length
          completedReports = reportsResult.data.filter(
            (report) => report.status === "resolved" || report.status === "completed",
          ).length
        }
      } else {
        const [reportsResult, usersResult] = await Promise.all([
          reportService.getAllReports(),
          userService.getAllUsers(1, 1000),
        ])

        if (reportsResult.kind === "ok" && reportsResult.data) {
          totalReports = reportsResult.data.total || 0
          const reports = reportsResult.data.reports || []
          pendingReports = reports.filter((report) => report.status === "pending").length
          completedReports = reports.filter(
            (report) => report.status === "resolved" || report.status === "completed",
          ).length
        }

        if (usersResult.kind === "ok" && usersResult.data) {
          totalUsers = usersResult.data.total || 0
        }
      }

      return adaptOverviewData({
        totalUsers,
        activeUsers: Math.floor(totalUsers * 0.7),
        newUsers: Math.floor(totalUsers * 0.05),
        totalReports,
        pendingReports,
        completedReports,
        greeting: "Chào mừng trở lại",
        lastUpdated: new Date().toISOString(),
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Không thể tải dữ liệu tổng quan")
    }
  }, [isUserRole])
  const { state, data } = useAsyncFetch<OverviewViewModel>(fetchOverviewData, [isUserRole])

  const avatarUrl = `https://facehash.dev/api/avatar?name=${encodeURIComponent(user?.username || authUsername || "guest")}&size=160`
  const cardBgColor = isDark ? colors.palette.neutral800 : colors.palette.neutral100
  const shadowStyle = isDark ? {} : $cardShadow

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const formattedDates = useMemo(() => {
    if (!user) return { created: "", updated: "" }
    return {
      created: new Date(user.created_at).toLocaleDateString("vi-VN"),
      updated: new Date(user.updated_at).toLocaleDateString("vi-VN"),
    }
  }, [user])

  const fullName = useMemo(() => {
    if (!user) return authUsername || "Không có dữ liệu"
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean)
    return parts.join(" ") || user.username
  }, [authUsername, user])

  const location = useMemo(() => {
    if (!user) return ""
    const parts = [user.address_line, user.ward, user.district, user.province].filter(Boolean)
    return parts.join(", ")
  }, [user])

  const handleEditProfile = () => {
    if (profileError) {
      appToast.error({
        title: "Lỗi",
        description: profileError || "Không thể tải hồ sơ. Vui lòng thử lại.",
      })
      return
    }

    navigation.navigate("ProfileEdit")
  }

  const ListRow = ({ icon: Icon, title, onPress, destructive = false, isLast = false }: any) => (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            $listRow,
            { backgroundColor: isDark ? colors.palette.neutral800 : colors.palette.neutral100 },
            !isLast && {
              borderBottomWidth: 1,
              borderBottomColor: isDark ? colors.palette.neutral700 : colors.palette.neutral300,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={$listRowLeft}>
            <View
              style={[
                $iconBox,
                destructive && {
                  backgroundColor: isDark ? colors.palette.angry500 : colors.palette.angry100,
                },
              ]}
            >
              <Icon color={destructive ? colors.error : colors.text} size={20} />
            </View>
            <Text
              text={title}
              style={[$listRowTitle, { color: destructive ? colors.error : colors.text }]}
            />
          </View>
          <View style={$listRowRight}>
            <ChevronRightIcon color={colors.textDim} size={20} />
          </View>
        </View>
      )}
    </Pressable>
  )

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={$screenContainer}
    >
      <View style={$content}>
        {/* Profile Hero section */}
        <Animated.View entering={FadeInDown.duration(400)} style={$heroSection}>
          <View style={$avatarWrapper}>
            <Image source={{ uri: avatarUrl }} style={$avatar} />
          </View>
          <View style={$heroInfo}>
            <Text text={fullName} preset="heading" style={themed($heroName)} />
            <View style={themed($roleBadge)}>
              <Text text={(user?.role || authRole || "guest").toUpperCase()} style={themed($roleText)} />
            </View>
          </View>
        </Animated.View>

        {profileLoading && (
          <View style={themed($loadingShell)}>
            <Skeleton loading={true} name="settings-profile-loading">
              <View style={themed($loadingCard)}>
                <View style={themed($loadingRow)}>
                  <View style={themed($loadingIcon)} />
                  <View style={themed($loadingTextBlock)}>
                    <Text text="Đang tải hồ sơ..." size="xs" />
                    <Text text="Đang lấy thông tin tài khoản của bạn" size="sm" />
                  </View>
                </View>
              </View>
            </Skeleton>
          </View>
        )}

        {profileError && !profileLoading && (
          <EmptyState
            title="Không thể tải hồ sơ"
            description={profileError}
            actionLabel="Thử lại"
            onAction={() => fetchProfile()}
          />
        )}

        {user && !profileLoading && (
          <>
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={$section}>
              <Text text="Thông tin liên hệ" size="sm" weight="bold" style={$profileSectionTitle} />
              <View style={[themed($profileCard), { backgroundColor: cardBgColor }, shadowStyle]}>
                <InfoRow icon={ChatBubbleLeftIcon} label="Email" value={user.email} colors={colors} />
                <View style={[$divider, { backgroundColor: colors.border }]} />
                <InfoRow icon={PhoneIcon} label="Số điện thoại" value={user.phone} colors={colors} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(140)} style={$section}>
              <Text text="Vị trí" size="sm" weight="bold" style={$profileSectionTitle} />
              <View style={[themed($profileCard), { backgroundColor: cardBgColor }, shadowStyle]}>
                <InfoRow icon={MapIcon} label="Địa chỉ" value={location} colors={colors} />
                {user.province && (
                  <>
                    <View style={[$divider, { backgroundColor: colors.border }]} />
                    <InfoRow icon={MapIcon} label="Tỉnh/Thành phố" value={user.province} colors={colors} />
                  </>
                )}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(180)} style={$section}>
              <Text text="Thông tin cá nhân" size="sm" weight="bold" style={$profileSectionTitle} />
              <View style={[themed($profileCard), { backgroundColor: cardBgColor }, shadowStyle]}>
                <InfoRow
                  icon={SparklesIcon}
                  label="Ngày sinh"
                  value={
                    user.date_of_birth
                      ? new Date(user.date_of_birth).toLocaleDateString("vi-VN")
                      : "Chưa cung cấp"
                  }
                  colors={colors}
                />
                <View style={[$divider, { backgroundColor: colors.border }]} />
                <InfoRow
                  icon={CheckCircleIcon}
                  label="Tên đăng nhập"
                  value={user.username}
                  colors={colors}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(220)} style={$section}>
              <Text text="Thông tin tài khoản" size="sm" weight="bold" style={$profileSectionTitle} />
              <View style={[themed($profileCard), { backgroundColor: cardBgColor }, shadowStyle]}>
                <View style={$metadataRow}>
                  <Text text="Ngày tạo" size="xs" style={{ color: colors.textDim }} />
                  <Text text={formattedDates.created} size="xs" />
                </View>
                <View style={[$divider, { backgroundColor: colors.border }]} />
                <View style={$metadataRow}>
                  <Text text="Cập nhật" size="xs" style={{ color: colors.textDim }} />
                  <Text text={formattedDates.updated} size="xs" />
                </View>
              </View>
            </Animated.View>
          </>
        )}

        {/* Dashboard area */}
        {state === "loading" && (
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={$section}>
            <View style={$sectionHeadingMargin}>
              <Text
                tx={isUserRole ? "profileHomeScreen:myReports" : undefined}
                text={!isUserRole ? "Tổng quan hệ thống" : undefined}
                style={themed($sectionLabel)}
              />
            </View>
            <View style={$cardGrid}>
              {Array.from({ length: isUserRole ? 2 : 3 }).map((_, index) => (
                <View
                  key={`settings-overview-skeleton-${index}`}
                  style={index < 2 ? $cardHalf : $cardFull}
                >
                  <Skeleton loading={true} name={`settings-overview-${index}`}>
                    <View style={themed($loadingSummaryCard)}>
                      <Text text="Đang tải" size="xs" />
                      <Text text="00" preset="heading" />
                    </View>
                  </Skeleton>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {state === "success" && data && (
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={$section}>
            <View style={$sectionHeadingMargin}>
              <Text
                tx={isUserRole ? "profileHomeScreen:myReports" : undefined}
                text={!isUserRole ? "Tổng quan hệ thống" : undefined}
                style={themed($sectionLabel)}
              />
            </View>
            <View style={$cardGrid}>
              <ProductCard
                label="Chờ xử lý"
                value={data.reportsSummary.pending}
                icon={BellIcon}
                isDark={isDark}
                colors={colors}
                style={$cardHalf}
              />
              <ProductCard
                label="Đã xử lý"
                value={data.reportsSummary.completed}
                icon={CheckBadgeIcon}
                isDark={isDark}
                colors={colors}
                style={$cardHalf}
              />
              {!isUserRole && (
                <ProductCard
                  label="Tổng người dùng"
                  value={data.usersSummary.total}
                  icon={UsersIcon}
                  isDark={isDark}
                  colors={colors}
                  style={$cardFull}
                />
              )}
            </View>
          </Animated.View>
        )}

        {/* Settings Menu */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)} style={$section}>
          <View style={$sectionHeadingMargin}>
            <Text text="Cài đặt" style={themed($sectionLabel)} />
          </View>
          <View style={themed($listGroup)}>
            <ListRow icon={CheckBadgeIcon} title="Chỉnh sửa hồ sơ" onPress={handleEditProfile} />
            <ListRow
              icon={ArrowRightOnRectangleIcon}
              title="Đăng xuất"
              onPress={logout}
              destructive
              isLast
            />
          </View>
        </Animated.View>
      </View>
    </Screen>
  )
}

const $screenContainer: ViewStyle = { paddingBottom: 24 }
const $content: ViewStyle = { paddingHorizontal: 12 }

const $heroSection: ViewStyle = {
  alignItems: "center",
  marginTop: 16,
  marginBottom: 20,
  gap: 8,
}
const $heroInfo: ViewStyle = { alignItems: "center", gap: 4 }
const $avatarWrapper: ViewStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 4,
}
const $avatar: ImageStyle = { width: 72, height: 72, borderRadius: 36 }
const $heroName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 20,
  lineHeight: 26,
})

const $roleBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.overlay10,
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 999,
})
const $roleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: 0.5,
})

const $section: ViewStyle = { marginBottom: 20 }
const $profileSectionTitle: ViewStyle = { marginBottom: 8, marginLeft: 4 }
const $sectionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.textDim,
  textTransform: "uppercase",
  letterSpacing: 1,
  marginLeft: 8,
})

const $cardGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
}
const $cardHalf: ViewStyle = { width: "48%" }
const $cardFull: ViewStyle = { width: "100%", marginTop: 8 }
const $sectionHeadingMargin: ViewStyle = { marginBottom: 8 }
const $productCardContainer: ViewStyle = {
  borderRadius: 14,
  padding: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}
const $productCardHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 8,
}
const $productCardHeaderText: TextStyle = { fontSize: 13, fontWeight: "500" }
const $productCardValue: TextStyle = { fontSize: 24, fontWeight: "700" }

const $profileCard: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 14,
  padding: 14,
})

const $cardShadow: ViewStyle = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
}

const $infoRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
}

const $profileIconWrapper: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
}

const $infoContent: ViewStyle = {
  flex: 1,
}

const $divider: ViewStyle = {
  height: 1,
  marginVertical: 12,
}

const $metadataRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $profileStatus: ViewStyle = {
  alignItems: "center",
  marginBottom: 16,
}

const $loadingShell: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $loadingCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 14,
  padding: spacing.md,
})

const $loadingRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
})

const $loadingIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral200,
})

const $loadingTextBlock: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $loadingSummaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 14,
  padding: spacing.md,
  minHeight: 88,
  justifyContent: "space-between",
})

const $listGroup: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 16,
  overflow: "hidden",
})
const $listRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  minHeight: 48,
}
const $listRowLeft: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12 }
const $listRowRight: ViewStyle = { marginLeft: 12, alignItems: "center", justifyContent: "center" }
const $iconBox: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
}
const $listRowTitle: TextStyle = { fontSize: 16, fontWeight: "500" }
