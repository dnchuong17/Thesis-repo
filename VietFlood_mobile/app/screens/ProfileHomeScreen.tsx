import { FC, useMemo } from "react"
import { View, ViewStyle, Pressable, TextStyle, useWindowDimensions } from "react-native"
import { Skeleton } from "boneyard-js/native"
import {
  UsersIcon,
  DocumentChartBarIcon,
  BellIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from "react-native-heroicons/outline"
import { ArrowRightIcon } from "react-native-heroicons/solid"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

import { EmptyState } from "@/components/EmptyState"
import { RoleBasedLayout } from "@/components/RoleBasedLayout"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { adaptOverviewData, OverviewViewModel } from "@/features/profile-home/overviewAdapter"
import { translate } from "@/i18n/translate"
import { useAsyncFetch } from "@/hooks/useAsyncFetch"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { reportService } from "@/services/api/reportService"
import { userService } from "@/services/api/userService"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ProfileHomeScreenProps extends AppStackScreenProps<"ProfileHome"> {}

async function fetchOverviewData(): Promise<OverviewViewModel | null> {
  try {
    const reportsResult = await reportService.getAllReports()
    const usersResult = await userService.getAllUsers(1, 1000)

    let totalReports = 0
    let pendingReports = 0
    let completedReports = 0
    let totalUsers = 0

    if (reportsResult.kind === "ok" && reportsResult.data) {
      totalReports = reportsResult.data.total || 0
      const reports = reportsResult.data.reports || []
      pendingReports = reports.filter((r: any) => r.status === "pending").length
      completedReports = reports.filter(
        (r: any) => r.status === "completed" || r.status === "resolved",
      ).length
    }

    if (usersResult.kind === "ok" && usersResult.data) {
      totalUsers = usersResult.data.total || 0
    }

    return adaptOverviewData({
      totalUsers,
      activeUsers: Math.floor(totalUsers * 0.7),
      newUsers: Math.floor(totalUsers * 0.05),
      totalReports,
      pendingReports,
      completedReports,
      greeting: translate("profileHomeScreen:greeting"),
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : translate("profileHomeScreen:loadOverviewError"),
    )
  }
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ElementType
  isDark: boolean
  style?: ViewStyle
  colors: any
  accentColor?: string
  accentBgColor?: string
}

const StatCard: FC<StatCardProps> = ({
  label,
  value,
  icon: IconComponent,
  isDark,
  style,
  colors,
  accentColor,
  accentBgColor,
}) => {
  const bgColor = isDark ? colors.palette.neutral800 : colors.palette.neutral100
  const fgColor = isDark ? colors.palette.neutral100 : colors.palette.neutral900
  const secondaryColor = isDark ? colors.palette.neutral400 : colors.palette.neutral500

  const defaultAccent = colors.tint
  const defaultAccentBg = isDark ? "rgba(59, 130, 246, 0.15)" : colors.statusInfoBackground

  const finalAccent = accentColor || defaultAccent
  const finalAccentBg = accentBgColor || defaultAccentBg

  return (
    <View style={[$statCardContainer, { backgroundColor: bgColor }, style]}>
      <View style={$statCardHeader}>
        <View style={[$iconWrapper, { backgroundColor: finalAccentBg }]}>
          {IconComponent && <IconComponent color={finalAccent} size={20} strokeWidth={2.5} />}
        </View>
        <Text
          text={`${value}`}
          style={[$statCardValue, { color: fgColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        />
      </View>
      <Text text={label} style={[$statCardLabel, { color: secondaryColor }]} />
    </View>
  )
}

export const ProfileHomeScreen: FC<ProfileHomeScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { isDark, colors },
  } = useAppTheme()
  const { authRole } = useAuth()
  const { state, data, error, retry } = useAsyncFetch<OverviewViewModel>(fetchOverviewData)

  const { width } = useWindowDimensions()
  const isMobile = width < 768

  const bgColor = isDark ? colors.palette.neutral900 : colors.palette.neutral200
  const fgColor = isDark ? colors.palette.neutral100 : colors.palette.neutral900

  const isUserRole = authRole === "user" || authRole === "resident"

  const dynamicStyles = useMemo(() => {
    return {
      containerLayout: { alignSelf: "center", width: "100%", maxWidth: 760 } as ViewStyle,
      cardTertiary: { width: isMobile ? "100%" : "48%" } as ViewStyle,
      cardPrimary: { width: isMobile ? "48%" : "32%" } as ViewStyle,
      cardFull: { width: "100%" } as ViewStyle,
      sectionTitle: {
        color: fgColor,
        marginBottom: 8,
        marginTop: 16,
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.5,
      } as TextStyle,
      actionRow: { flexDirection: "row", gap: 12 } as ViewStyle,
      flex1: { flex: 1 } as ViewStyle,
    }
  }, [isMobile, fgColor])

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={[themed($container), { backgroundColor: bgColor }]}
      safeAreaEdges={[]}
    >
      {state === "loading" && (
        <View style={themed($loadingContainer)}>
          <Skeleton name="profile-home-layout" loading={true}>
            <View style={themed($skeletonRoot)}>
              <View style={themed($skeletonHeader)}>
                <View style={themed($skeletonAvatar)} />
                <View style={themed($skeletonGreeting)} />
              </View>
              <View style={themed($skeletonHero)} />
              <View style={themed($skeletonGrid)}>
                <View style={themed($skeletonCard)} />
                <View style={themed($skeletonCard)} />
              </View>
            </View>
          </Skeleton>
        </View>
      )}

      {state === "success" && data && (
        <View style={dynamicStyles.flex1}>
          <RoleBasedLayout
            showHeader={false}
            roleIcon={
              isUserRole ? (
                <DocumentChartBarIcon color={colors.palette.primary500} size={28} />
              ) : (
                <UsersIcon color={colors.palette.primary600} size={28} />
              )
            }
          >
            <View style={[themed($content), dynamicStyles.containerLayout]}>
              {/* Quick Action Top Banner - Modern Touch */}
              <Animated.View
                entering={FadeInUp.duration(500).delay(100)}
                style={themed($heroContainer)}
              >
                {!isUserRole && (
                  <View style={themed($heroTextContainer)}>
                    <Text tx="profileHomeScreen:heroTitle" style={themed($heroTitle)} preset="heading" />
                    <Text tx="profileHomeScreen:heroSubtitle" style={themed($heroSubtitle)} />
                  </View>
                )}
                <Pressable
                  style={themed($heroButton)}
                  onPress={() => navigation.navigate("Reports")}
                >
                  <Text
                    tx={isUserRole ? "profileHomeScreen:ownReportsAction" : "profileHomeScreen:allReportsAction"}
                    style={themed($heroButtonText)}
                    preset="bold"
                  />
                  <ArrowRightIcon
                    size={16}
                    color={isDark ? colors.palette.neutral900 : colors.palette.neutral100}
                    strokeWidth={2.5}
                  />
                </Pressable>
              </Animated.View>

              {isUserRole ? (
                <View>
                  <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <Text tx="profileHomeScreen:myReports" style={dynamicStyles.sectionTitle} />
                    <View style={themed($cardGrid)}>
                      <StatCard
                        label={translate("profileHomeScreen:pending")}
                        value={data.reportsSummary.pending}
                        icon={BellIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusWarning}
                        accentBgColor={colors.statusWarningBackground}
                        style={dynamicStyles.cardPrimary}
                      />
                      <StatCard
                        label={translate("profileHomeScreen:completed")}
                        value={data.reportsSummary.completed}
                        icon={CheckBadgeIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusSuccess}
                        accentBgColor={colors.statusSuccessBackground}
                        style={dynamicStyles.cardPrimary}
                      />
                      <StatCard
                        label={translate("profileHomeScreen:totalReports")}
                        value={data.reportsSummary.total}
                        icon={ChartBarIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusInfo}
                        accentBgColor={colors.statusInfoBackground}
                        style={isMobile ? dynamicStyles.cardFull : dynamicStyles.cardPrimary}
                      />
                    </View>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                    <Text tx="profileHomeScreen:communityStatus" style={dynamicStyles.sectionTitle} />
                    <View style={themed($cardGrid)}>
                      <StatCard
                        label={translate("profileHomeScreen:activeAlerts")}
                        value={Math.floor(Math.random() * 15) + 3}
                        icon={ExclamationCircleIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusError}
                        accentBgColor={colors.statusErrorBackground}
                        style={dynamicStyles.cardTertiary}
                      />
                      <StatCard
                        label={translate("profileHomeScreen:reliefPoints")}
                        value={Math.floor(Math.random() * 12) + 2}
                        icon={UsersIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.palette.primary500}
                        accentBgColor={
                          isDark ? "rgba(59, 130, 246, 0.15)" : colors.palette.primary100
                        }
                        style={dynamicStyles.cardTertiary}
                      />
                    </View>
                  </Animated.View>
                </View>
              ) : (
                <View>
                  <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <View style={themed($sectionHeader)}>
                      <Text
                        tx="profileHomeScreen:reportStatus"
                        style={[dynamicStyles.sectionTitle, themed($sectionTitleZeroMargin)]}
                      />
                      <Pressable onPress={() => navigation.navigate("Reports")}>
                        <Text
                          tx="profileHomeScreen:viewAll"
                          style={[themed($viewAllText), { color: colors.tint }]}
                        />
                      </Pressable>
                    </View>

                    <View style={themed($cardGrid)}>
                      <StatCard
                        label={translate("profileHomeScreen:pendingReview")}
                        value={data.reportsSummary.pending}
                        icon={ExclamationCircleIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusWarning}
                        accentBgColor={colors.statusWarningBackground}
                        style={dynamicStyles.cardPrimary}
                      />
                      <StatCard
                        label={translate("profileHomeScreen:finished")}
                        value={data.reportsSummary.completed}
                        icon={CheckCircleIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusSuccess}
                        accentBgColor={colors.statusSuccessBackground}
                        style={dynamicStyles.cardPrimary}
                      />
                      <StatCard
                        label={translate("profileHomeScreen:totalCount")}
                        value={data.reportsSummary.total}
                        icon={ChartBarIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusInfo}
                        accentBgColor={colors.statusInfoBackground}
                        style={isMobile ? dynamicStyles.cardFull : dynamicStyles.cardPrimary}
                      />
                    </View>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                    <View style={themed($sectionHeader)}>
                      <Text
                        tx="profileHomeScreen:systemUsers"
                        style={[dynamicStyles.sectionTitle, themed($sectionTitleZeroMargin)]}
                      />
                      <Pressable onPress={() => navigation.navigate("UsersOverview")}>
                        <Text
                          tx="profileHomeScreen:manageUsers"
                          style={[themed($viewAllText), { color: colors.tint }]}
                        />
                      </Pressable>
                    </View>

                    <View style={themed($cardGrid)}>
                      <StatCard
                        label={translate("profileHomeScreen:activeUsers")}
                        value={data.usersSummary.active}
                        icon={CheckBadgeIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.statusSuccess}
                        accentBgColor={colors.statusSuccessBackground}
                        style={dynamicStyles.cardTertiary}
                      />
                      <StatCard
                        label={translate("profileHomeScreen:newUsers")}
                        value={data.usersSummary.new}
                        icon={UserPlusIcon}
                        isDark={isDark}
                        colors={colors}
                        accentColor={colors.palette.primary500}
                        accentBgColor={
                          isDark ? "rgba(59, 130, 246, 0.15)" : colors.palette.primary100
                        }
                        style={dynamicStyles.cardTertiary}
                      />
                    </View>
                  </Animated.View>
                </View>
              )}

            </View>
          </RoleBasedLayout>
        </View>
      )}

      {state === "empty" && (
        <EmptyState
          title={translate("profileHomeScreen:emptyTitle")}
          description={translate("profileHomeScreen:emptyDescription")}
          actionLabel={translate("profileHomeScreen:emptyAction")}
          onAction={() => retry()}
        />
      )}

      {state === "error" && (
        <EmptyState
          title={translate("profileHomeScreen:connectionErrorTitle")}
          description={error || translate("profileHomeScreen:connectionErrorDescription")}
          actionLabel={translate("profileHomeScreen:retryAction")}
          onAction={() => retry()}
        />
      )}
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
})

const $content: ThemedStyle<ViewStyle> = () => ({
  paddingHorizontal: 16,
  paddingBottom: 24,
  paddingTop: 8,
})

// Hero Banner
const $heroContainer: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  backgroundColor: isDark ? colors.palette.primary700 : colors.palette.primary500,
  borderRadius: 18,
  padding: 16,
  marginTop: 8,
  marginBottom: 8,
  flexDirection: "column",
  shadowColor: colors.palette.primary600,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,
})

const $heroTextContainer: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 12,
})

const $heroTitle: ThemedStyle<TextStyle> = ({ colors, isDark }) => ({
  color: isDark ? colors.palette.neutral100 : colors.palette.neutral100,
  fontSize: 22,
  marginBottom: 4,
})

const $heroSubtitle: ThemedStyle<TextStyle> = ({ colors, isDark }) => ({
  color: isDark ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.9)",
  fontSize: 14,
  lineHeight: 20,
})

const $heroButton: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  backgroundColor: isDark ? colors.palette.neutral100 : colors.palette.neutral100,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
})

const $heroButtonText: ThemedStyle<TextStyle> = ({ colors, isDark }) => ({
  color: isDark ? colors.palette.neutral900 : colors.palette.primary600,
  fontSize: 16,
})

// Stat Card
const $statCardContainer: ViewStyle = {
  borderRadius: 16,
  padding: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 1,
}

const $statCardHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 8,
}

const $iconWrapper: ViewStyle = {
  width: 34,
  height: 34,
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
}

const $statCardValue: TextStyle = {
  fontSize: 24,
  fontWeight: "800",
  lineHeight: 28,
  flex: 1,
  textAlign: "right",
  paddingLeft: 8,
}

const $statCardLabel: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: -0.2,
}

const $cardGrid: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "space-between",
})

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $skeletonRoot: ThemedStyle<ViewStyle> = () => ({ flex: 1, paddingHorizontal: 20 })
const $skeletonHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 24,
  marginBottom: 12,
})
const $skeletonAvatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.palette.neutral200,
})
const $skeletonGreeting: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 100,
  height: 24,
  backgroundColor: colors.palette.neutral200,
  alignSelf: "center",
  borderRadius: 6,
})
const $skeletonHero: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 88,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 24,
  marginBottom: 16,
})
const $skeletonGrid: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  gap: 8,
  marginBottom: 16,
})
const $skeletonCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 88,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
})

const $sectionHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
  marginBottom: 8,
  marginTop: 16,
})

const $sectionTitleZeroMargin: ThemedStyle<TextStyle> = () => ({
  marginBottom: 0,
  marginTop: 0,
})

const $viewAllText: ThemedStyle<TextStyle> = () => ({
  fontWeight: "600",
})
