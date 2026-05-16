import {
  FC,
  ComponentType,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { FlatList, Pressable, TextStyle, useWindowDimensions, View, ViewStyle } from "react-native"
import { Skeleton } from "boneyard-js/native"
import Animated from "react-native-reanimated"
import {
  BoltIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  MapIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "react-native-heroicons/outline"

import { EmptyState } from "@/components/EmptyState"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import type { UserRoleValue } from "@/features/users/usersAdapter"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { userService } from "@/services/api/userService"
import { useAppTheme } from "@/theme/context"
import { createFadeInDown, createFadeInUp, softLayoutTransition } from "@/theme/motionPresets"
import type { ThemedStyle } from "@/theme/types"

interface UsersOverviewScreenProps extends AppStackScreenProps<"UsersOverview"> {}

type OverviewRole = UserRoleValue | "all"

interface OverviewUser {
  id: number
  first_name?: string
  middle_name?: string
  last_name?: string
  email?: string
  phone?: string
  province?: string
  ward?: string
  role?: string
  created_at?: string
  username?: string
}

const PAGE_SIZE = 50

const roleFilterOptions: OverviewRole[] = ["all", "admin", "coordinator", "volunteer", "resident"]

function getFullName(user: OverviewUser): string {
  const fullName = [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return fullName || user.username || user.email || `Người dùng #${user.id}`
}

function getInitials(user: OverviewUser): string {
  const nameParts = getFullName(user).split(" ").filter(Boolean).slice(0, 2)

  if (nameParts.length === 0) return "N"
  return nameParts.map((part) => part[0]?.toUpperCase() ?? "").join("")
}

function formatRoleLabel(role?: string) {
  if (!role) return "Thành viên"

  switch (role) {
    case "admin":
      return "Quản trị viên"
    case "coordinator":
      return "Điều phối viên"
    case "volunteer":
      return "Tình nguyện viên"
    case "resident":
      return "Người dân"
    default:
      return role
  }
}

function formatJoinedDate(value?: string) {
  if (!value) return "Không rõ"

  const parsedValue = new Date(String(value).replace(" ", "T"))
  if (Number.isNaN(parsedValue.getTime())) return "Không rõ"

  return parsedValue.toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatLastSync(value: Date | null) {
  if (!value) return "Chưa đồng bộ"

  return value.toLocaleTimeString("vi-VN", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export const UsersOverviewScreen: FC<UsersOverviewScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { width } = useWindowDimensions()

  const [users, setUsers] = useState<OverviewUser[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedRole, setSelectedRole] = useState<OverviewRole>("all")

  const gridColumns = width >= 1180 ? 3 : width >= 780 ? 2 : 1
  const cardWidthStyle = useMemo<ViewStyle>(() => {
    if (gridColumns === 1) return { width: "100%" }
    if (gridColumns === 2) return { width: "48.8%" }
    return { width: "31.8%" }
  }, [gridColumns])

  const loadUsersPage = useCallback(
    async (page: number, mode: "replace" | "append" = "replace") => {
      if (mode === "append") {
        setIsLoadingMore(true)
      } else if (!isRefreshing) {
        setIsInitialLoading(true)
      }

      if (mode === "replace") {
        setError(null)
      }

      try {
        const result = await userService.getAllUsers(page, PAGE_SIZE)
        if (result.kind !== "ok") {
          setError("Hiện không thể tải danh bạ người dùng.")
          if (mode === "replace") setUsers([])
          return
        }

        const loadedUsers = (result.data.users ?? []) as OverviewUser[]
        setUsers((prev) => (mode === "append" ? [...prev, ...loadedUsers] : loadedUsers))
        setCurrentPage(page)
        setTotalCount(result.data.total ?? loadedUsers.length)
        setHasMorePages(page * PAGE_SIZE < (result.data.total ?? 0))
        setLastSyncedAt(new Date())
      } catch (loadError) {
        if (__DEV__) {
          console.error("Failed to load users", loadError)
        }
        setError("Hiện không thể tải danh bạ người dùng.")
        if (mode === "replace") setUsers([])
      } finally {
        setIsInitialLoading(false)
        setIsRefreshing(false)
        setIsLoadingMore(false)
      }
    },
    [isRefreshing],
  )

  useEffect(() => {
    void loadUsersPage(1, "replace")
  }, [loadUsersPage])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    void loadUsersPage(1, "replace")
  }, [loadUsersPage])

  const handleLoadMore = useCallback(() => {
    if (isInitialLoading || isRefreshing || isLoadingMore || !hasMorePages) return
    void loadUsersPage(currentPage + 1, "append")
  }, [currentPage, hasMorePages, isInitialLoading, isLoadingMore, isRefreshing, loadUsersPage])

  const searchLeftAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function SearchLeftAccessoryComponent(props: TextFieldAccessoryProps) {
        return (
          <View style={[themed($searchAccessory), props.style as ViewStyle]}>
            <UsersIcon color={colors.textDim} size={16} />
          </View>
        )
      },
    [colors.textDim, themed],
  )

  const filteredUsers = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()

    return users.filter((user) => {
      const matchesRole = selectedRole === "all" || user.role === selectedRole
      const matchesQuery =
        normalizedQuery.length === 0 ||
        getFullName(user).toLowerCase().includes(normalizedQuery) ||
        (user.email || "").toLowerCase().includes(normalizedQuery) ||
        (user.phone || "").toLowerCase().includes(normalizedQuery) ||
        (user.province || "").toLowerCase().includes(normalizedQuery) ||
        (user.ward || "").toLowerCase().includes(normalizedQuery)

      return matchesRole && matchesQuery
    })
  }, [deferredSearchQuery, selectedRole, users])

  const summary = useMemo(() => {
    const roleCount = (role: UserRoleValue) => users.filter((user) => user.role === role).length

    return {
      total: totalCount || users.length,
      admins: roleCount("admin"),
      coordinators: roleCount("coordinator"),
      volunteers: roleCount("volunteer"),
      residents: roleCount("resident"),
    }
  }, [totalCount, users])

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedRole !== "all"

  const getRoleMeta = useCallback(
    (role?: string) => {
      switch (role) {
        case "admin":
          return {
            accent: colors.error,
            background: colors.errorBackground,
            pill: { backgroundColor: colors.errorBackground, borderColor: `${colors.error}24` },
            textColor: colors.error,
          }
        case "coordinator":
          return {
            accent: colors.tint,
            background: colors.statusInfoBackground,
            pill: {
              backgroundColor: colors.statusInfoBackground,
              borderColor: `${colors.tint}24`,
            },
            textColor: colors.tint,
          }
        case "volunteer":
          return {
            accent: colors.warning,
            background: colors.warningBackground,
            pill: {
              backgroundColor: colors.warningBackground,
              borderColor: `${colors.warning}24`,
            },
            textColor: colors.warning,
          }
        default:
          return {
            accent: colors.success,
            background: colors.successBackground,
            pill: {
              backgroundColor: colors.successBackground,
              borderColor: `${colors.success}24`,
            },
            textColor: colors.success,
          }
      }
    },
    [
      colors.error,
      colors.errorBackground,
      colors.statusInfoBackground,
      colors.success,
      colors.successBackground,
      colors.tint,
      colors.warning,
      colors.warningBackground,
    ],
  )

  if (isInitialLoading && users.length === 0) {
    return (
      <Screen preset="fixed" contentContainerStyle={themed($container)}>
        <Header
          title="Người dùng"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
          rightText="Báo cáo"
          onRightPress={() => navigation.navigate("Reports")}
        />

        <View style={themed($loadingShell)}>
          <View style={themed($heroSkeleton)}>
            <Skeleton loading={true} name="users-hero">
              <Text text="Danh bạ người dùng" size="xs" />
              <Text text="Quản lý nhân sự trong mạng lưới ứng phó" preset="heading" />
              <Text text="Tìm theo tên, liên hệ hoặc vị trí" size="xs" />
            </Skeleton>
          </View>

          <View style={themed($summarySkeletonGrid)}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={themed($summarySkeletonCard)}>
                <Skeleton loading={true} name={`users-summary-${index}`}>
                  <Text text="Đang tải" size="xxs" />
                  <Text text="00" preset="heading" />
                  <Text text="thành viên" size="xxs" />
                </Skeleton>
              </View>
            ))}
          </View>

          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={[themed($userCardWrap), cardWidthStyle]}>
              <View style={themed($userCard)}>
                <Skeleton loading={true} name={`user-card-${index}`}>
                  <Text text="Nguyen Van A" preset="bold" />
                  <Text text="quản trị viên" size="xs" />
                  <Text text="email@example.com" size="xs" />
                  <Text text="TP. Hồ Chí Minh" size="xs" />
                </Skeleton>
              </View>
            </View>
          ))}
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($container)}>
      <Header
        title="Người dùng"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        rightText="Báo cáo"
        onRightPress={() => navigation.navigate("Reports")}
      />

      <FlatList
        data={filteredUsers}
        key={`users-grid-${gridColumns}-${selectedRole}`}
        numColumns={gridColumns}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.45}
        columnWrapperStyle={gridColumns > 1 ? themed($gridRow) : undefined}
        contentContainerStyle={themed($listContainer)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Animated.View
              entering={createFadeInDown(0)}
              layout={softLayoutTransition}
              style={themed($heroCard)}
            >
              <View style={themed($heroGlowPrimary)} />
              <View style={themed($heroGlowSecondary)} />

              <View style={themed($heroHeader)}>
                <View style={themed($heroBadge)}>
                  <SparklesIcon size={14} color={colors.tint} />
                  <Text
                    text="Danh bạ điều hành"
                    size="xxxs"
                    preset="bold"
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
                text="Quản lý nhân sự trong mạng lưới ứng phó ngập lụt"
                preset="heading"
                style={themed($heroTitle)}
              />
              <Text
                text="Tìm trong danh sách đội ngũ, lọc theo vai trò và theo dõi danh bạ ứng cứu rõ ràng trên mọi màn hình."
                size="sm"
                style={themed($heroSubtitle)}
              />

              <View style={themed($heroMetaRow)}>
                <View style={themed($heroMetaPill)}>
                  <UsersIcon size={14} color={colors.textPrimary} />
                  <Text
                    text={`${summary.total} người dùng`}
                    size="xxxs"
                    preset="bold"
                    style={themed($heroMetaText)}
                  />
                </View>
                <View style={themed($heroMetaPill)}>
                  <BoltIcon size={14} color={colors.cta} />
                  <Text
                    text={
                      hasActiveFilters
                        ? `${filteredUsers.length} đang hiển thị sau lọc`
                        : "Chế độ danh bạ trực tiếp"
                    }
                    size="xxxs"
                    preset="bold"
                    style={themed($heroMetaText)}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={createFadeInUp(1)}
              layout={softLayoutTransition}
              style={themed($summaryGrid)}
            >
              {[
                {
                  key: "total",
                  label: "Tất cả thành viên",
                  value: summary.total,
                  icon: <UsersIcon size={18} color={colors.tint} />,
                  backgroundColor: colors.statusInfoBackground,
                },
                {
                  key: "admins",
                  label: "Quản trị viên",
                  value: summary.admins,
                  icon: <ShieldCheckIcon size={18} color={colors.error} />,
                  backgroundColor: colors.errorBackground,
                },
                {
                  key: "coordinators",
                  label: "Điều phối viên",
                  value: summary.coordinators,
                  icon: <BoltIcon size={18} color={colors.cta} />,
                  backgroundColor: colors.warningBackground,
                },
                {
                  key: "volunteers",
                  label: "Tình nguyện viên",
                  value: summary.volunteers,
                  icon: <CheckBadgeIcon size={18} color={colors.success} />,
                  backgroundColor: colors.successBackground,
                },
              ].map((item, index) => (
                <Animated.View
                  key={item.key}
                  entering={createFadeInUp(index + 2)}
                  layout={softLayoutTransition}
                  style={themed($summaryCard)}
                >
                  <View
                    style={[themed($summaryIconWrap), { backgroundColor: item.backgroundColor }]}
                  >
                    {item.icon}
                  </View>
                  <Text text={String(item.value)} preset="heading" style={themed($summaryValue)} />
                  <Text text={item.label} size="xxs" preset="bold" style={themed($summaryLabel)} />
                </Animated.View>
              ))}
            </Animated.View>

            <Animated.View
              entering={createFadeInUp(2)}
              layout={softLayoutTransition}
              style={themed($controlsCard)}
            >
              <Text
                text="Tìm kiếm và lọc"
                size="xxs"
                preset="bold"
                style={themed($controlsLabel)}
              />
              <TextField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm theo tên, email, số điện thoại hoặc vị trí"
                containerStyle={themed($searchField)}
                inputWrapperStyle={themed($searchInputWrapper)}
                style={themed($searchInput)}
                LeftAccessory={searchLeftAccessory}
              />

              <View style={themed($roleFilterRow)}>
                {roleFilterOptions.map((role) => {
                  const isSelected = selectedRole === role
                  return (
                    <Pressable
                      key={role}
                      onPress={() => setSelectedRole(role)}
                      style={({ pressed }) => [
                        themed($roleChip),
                        isSelected && themed($roleChipActive),
                        pressed && themed($roleChipPressed),
                      ]}
                    >
                      <Text
                        text={role === "all" ? "Tất cả vai trò" : formatRoleLabel(role)}
                        size="xxs"
                        preset="bold"
                        style={[themed($roleChipText), isSelected && themed($roleChipTextActive)]}
                      />
                    </Pressable>
                  )
                })}
              </View>

              <Text
                text={`Đang hiển thị ${filteredUsers.length} / ${summary.total} người dùng`}
                size="xs"
                style={themed($summaryText)}
              />
            </Animated.View>

            {error && (
              <Animated.View
                entering={createFadeInUp(3)}
                layout={softLayoutTransition}
                style={themed($errorBanner)}
              >
                <View style={themed($errorIconWrap)}>
                  <ExclamationCircleIcon size={18} color={colors.error} />
                </View>
                <View style={themed($errorCopy)}>
                  <Text
                    text="Danh bạ không khả dụng"
                    size="xxs"
                    preset="bold"
                    style={themed($errorTitle)}
                  />
                  <Text text={error} size="xs" style={themed($errorMessage)} />
                </View>
              </Animated.View>
            )}

            <Animated.View
              entering={createFadeInUp(4)}
              layout={softLayoutTransition}
              style={themed($sectionHeader)}
            >
              <View>
                <Text text="Danh sách đội ngũ" preset="subheading" style={themed($sectionTitle)} />
                <Text
                  text="Duyệt danh bạ và theo dõi phân bố vai trò trong khi tìm kiếm."
                  size="xs"
                  style={themed($sectionSubtitle)}
                />
              </View>
            </Animated.View>
          </>
        }
        ListEmptyComponent={
          <Animated.View
            entering={createFadeInUp(1)}
            layout={softLayoutTransition}
            style={themed($emptyStateWrap)}
          >
            <EmptyState
              title="Không có người dùng phù hợp"
              description="Hãy xóa từ khóa tìm kiếm hoặc chuyển sang bộ lọc vai trò khác."
            />
          </Animated.View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={themed($loadMoreIndicator)}>
              <Skeleton loading={true} name="users-load-more">
                <Text text="Đang tải thêm người dùng..." size="sm" />
              </Skeleton>
            </View>
          ) : filteredUsers.length > 0 ? (
            <View style={themed($footerSpacer)}>
              <Text
                text={
                  hasMorePages
                    ? "Cuộn xuống để xem thêm người dùng"
                    : "Bạn đã đến cuối danh sách"
                }
                size="xxs"
                style={themed($footerText)}
              />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const roleMeta = getRoleMeta(item.role)

          return (
            <Animated.View
              entering={createFadeInUp(Math.min(index, 7))}
              layout={softLayoutTransition}
              style={[themed($userCardWrap), cardWidthStyle]}
            >
              <View style={themed($userCard)}>
                <View style={themed($userCardHeader)}>
                  <View style={[themed($avatarWrap), { backgroundColor: roleMeta.background }]}>
                    <Text
                      text={getInitials(item)}
                      size="xs"
                      preset="bold"
                      style={{ color: roleMeta.accent }}
                    />
                  </View>

                  <View style={themed($userHeadingCopy)}>
                    <Text
                      text={getFullName(item)}
                      size="sm"
                      preset="bold"
                      numberOfLines={2}
                      style={themed($userName)}
                    />
                    <Text
                      text={item.email || "Chưa có email"}
                      size="xxs"
                      numberOfLines={1}
                      style={themed($userEmail)}
                    />
                  </View>
                </View>

                <View style={themed($userRoleRow)}>
                  <View style={[themed($rolePill), roleMeta.pill]}>
                    <Text
                      text={formatRoleLabel(item.role)}
                      size="xxxs"
                      preset="bold"
                      style={{ color: roleMeta.textColor }}
                    />
                  </View>
                  <View style={themed($idPill)}>
                    <Text text={`#${item.id}`} size="xxxs" preset="bold" style={themed($idText)} />
                  </View>
                </View>

                <View style={themed($detailList)}>
                  <View style={themed($detailRow)}>
                    <UserIcon size={14} color={colors.textDim} />
                    <Text
                      text={item.username || "Chưa có tên đăng nhập"}
                      size="xxs"
                      style={themed($detailText)}
                      numberOfLines={1}
                    />
                  </View>
                  <View style={themed($detailRow)}>
                    <PhoneIcon size={14} color={colors.textDim} />
                    <Text
                      text={item.phone || "Chưa có số điện thoại"}
                      size="xxs"
                      style={themed($detailText)}
                      numberOfLines={1}
                    />
                  </View>
                  <View style={themed($detailRow)}>
                    <MapIcon size={14} color={colors.textDim} />
                    <Text
                      text={
                        [item.ward, item.province].filter(Boolean).join(", ") ||
                        "Chưa có vị trí"
                      }
                      size="xxs"
                      style={themed($detailText)}
                      numberOfLines={2}
                    />
                  </View>
                </View>

                <View style={themed($footerRow)}>
                  <View>
                    <Text text="Tham gia" size="xxxs" preset="bold" style={themed($footerLabel)} />
                    <Text
                      text={formatJoinedDate(item.created_at)}
                      size="xxs"
                      style={themed($footerValue)}
                    />
                  </View>
                  <View style={themed($statusDot)} />
                </View>
              </View>
            </Animated.View>
          )
        }}
      />
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $loadingShell: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  gap: spacing.sm,
})

const $heroSkeleton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 20,
  padding: spacing.md,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
})

const $summarySkeletonGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
})

const $summarySkeletonCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "47%",
  borderRadius: 16,
  padding: spacing.sm,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
})

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xl,
})

const $heroCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 20,
  padding: spacing.md,
  marginBottom: spacing.md,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
})

const $heroGlowPrimary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: 999,
  backgroundColor: colors.statusInfoBackground,
  top: -120,
  right: -60,
})

const $heroGlowSecondary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 160,
  height: 160,
  borderRadius: 999,
  backgroundColor: colors.glowStrong,
  bottom: -100,
  left: -50,
})

const $heroHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
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
  color: colors.textDim,
})

const $heroTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  marginBottom: spacing.xs,
  lineHeight: 32,
})

const $heroSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $heroMetaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginTop: spacing.sm,
})

const $heroMetaPill: ThemedStyle<ViewStyle> = ({ colors, spacing, isDark }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: isDark ? colors.surfaceAlt : colors.surfaceBackdrop,
  borderWidth: 1,
  borderColor: colors.border,
})

const $heroMetaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $summaryGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xxs,
  marginBottom: spacing.md,
})

const $summaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  minWidth: 0,
  borderRadius: 16,
  padding: spacing.xs,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
})

const $summaryIconWrap: ThemedStyle<ViewStyle> = () => ({
  width: 30,
  height: 30,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 4,
})

const $summaryValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontSize: 22,
  lineHeight: 26,
})

const $summaryLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textSecondary,
  marginTop: spacing.xxs,
})

const $controlsCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 16,
  padding: spacing.sm,
  marginBottom: spacing.md,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
})

const $controlsLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xs,
})

const $searchField: ThemedStyle<ViewStyle> = () => ({
  gap: 0,
})

const $searchInputWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minHeight: 48,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  backgroundColor: colors.inputBackground,
  borderWidth: 1,
  borderColor: colors.inputBorder,
})

const $searchInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $searchAccessory: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
  justifyContent: "center",
  alignItems: "center",
})

const $roleFilterRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
})

const $roleChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
})

const $roleChipActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: `${colors.tint}30`,
  backgroundColor: colors.statusInfoBackground,
})

const $roleChipPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.84,
})

const $roleChipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $roleChipTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $summaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
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
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.72)",
})

const $errorCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $errorTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginBottom: spacing.xxs,
})

const $errorMessage: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
})

const $sectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $sectionSubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $gridRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $userCardWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $userCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 18,
  padding: spacing.sm,
  backgroundColor: colors.surfaceRaised,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 184,
})

const $userCardHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $avatarWrap: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
})

const $userHeadingCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $userName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})

const $userEmail: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $userRoleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $rolePill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
})

const $idPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: colors.border,
})

const $idText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $detailList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
  marginBottom: spacing.sm,
})

const $detailRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
})

const $detailText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textSecondary,
})

const $footerRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  marginTop: "auto",
})

const $footerLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $footerValue: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textPrimary,
  marginTop: spacing.xxs,
})

const $statusDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 10,
  height: 10,
  borderRadius: 999,
  backgroundColor: colors.success,
})

const $loadMoreIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
  alignItems: "center",
})

const $footerSpacer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.xs,
  paddingBottom: spacing.lg,
  alignItems: "center",
})

const $footerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $emptyStateWrap: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderRadius: 22,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceRaised,
  marginTop: spacing.sm,
})
