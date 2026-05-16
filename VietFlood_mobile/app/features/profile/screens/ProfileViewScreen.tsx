/**
 * Profile View Screen
 *
 * Displays the current user's profile information including:
 * - Name (first, middle, last)
 * - Email
 * - Phone number
 * - Location (province, district, ward, address)
 * - Date of birth
 * - Role
 * - Timestamps (created, updated)
 *
 * Provides an edit button to navigate to ProfileEditScreen
 */

import { useEffect, useMemo, FC } from "react"
import {
  View,
  ViewStyle,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  ImageStyle,
} from "react-native"
import {
  UsersIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  MapIcon,
  SparklesIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
} from "react-native-heroicons/outline"

import { EmptyState } from "@/components/EmptyState"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useProfile } from "@/hooks/useProfile"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ProfileViewScreenProps extends AppStackScreenProps<"ProfileView"> {}

interface InfoRowProps {
  icon: React.ComponentType<any>
  label: string
  value: string | undefined
  colors: any
}

/**
 * Info row component for displaying profile field
 */
const InfoRow: FC<InfoRowProps> = ({ icon: IconComponent, label, value, colors }) => {
  return (
    <View style={$infoRow}>
      <View style={[$iconWrapper, { backgroundColor: colors.tint + "1A" }]}>
        <IconComponent size={20} color={colors.tint} strokeWidth={2} />
      </View>
      <View style={$infoContent}>
        <Text text={label} size="xs" style={{ color: colors.textDim }} />
        <Text
          text={value || translate("profileViewScreen:notProvided")}
          size="sm"
          style={{ marginTop: 2 }}
        />
      </View>
    </View>
  )
}

export const ProfileViewScreen: FC<ProfileViewScreenProps> = ({ navigation }) => {
  const { user, loading, error, fetchProfile } = useProfile()
  const {
    themed,
    theme: { colors, isDark },
  } = useAppTheme()

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Format dates for display
  const formattedDates = useMemo(() => {
    if (!user) return { created: "", updated: "" }
    return {
      created: new Date(user.created_at).toLocaleDateString("vi-VN"),
      updated: new Date(user.updated_at).toLocaleDateString("vi-VN"),
    }
  }, [user])

  // Format full name
  const fullName = useMemo(() => {
    if (!user) return ""
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean)
    return parts.join(" ")
  }, [user])

  // Format location
  const location = useMemo(() => {
    if (!user) return ""
    const parts = [user.address_line, user.ward, user.district, user.province].filter(Boolean)
    return parts.join(", ")
  }, [user])

  const avatarUrl = user
    ? `https://facehash.dev/api/avatar?name=${encodeURIComponent(user.username)}&size=160`
    : ""

  const bgColor = isDark ? colors.palette.neutral900 : colors.palette.neutral100
  const cardBgColor = isDark ? colors.palette.neutral800 : colors.palette.neutral100
  const shadowStyle = isDark ? {} : $cardShadow // Apply subtle shadow only in light mode

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={[themed($container), { backgroundColor: bgColor }]}
    >
      {/* Back Button Header */}
      <View style={themed($headerBar)}>
        <Pressable
          style={({ pressed }) => [
            $backButton,
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text tx="profileViewScreen:title" size="lg" weight="bold" />
        <View style={{ width: 44 }} />
      </View>

      {loading && (
        <View style={$centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text tx="profileViewScreen:loading" style={{ marginTop: 12 }} />
        </View>
      )}

      {error && (
        <EmptyState
          title={translate("profileViewScreen:loadErrorTitle")}
          description={error}
          actionLabel={translate("common:retry")}
          onAction={() => fetchProfile()}
        />
      )}

      {user && !loading && (
        <>
          {/* Header Card */}
          <View
            style={[
              themed($card),
              { backgroundColor: cardBgColor },
              shadowStyle,
              { paddingBottom: 16, marginBottom: 12 },
            ]}
          >
            <View style={$headerContent}>
              <View style={$avatarPlaceholder}>
                <Image source={{ uri: avatarUrl }} style={$avatar} />
              </View>
              <View style={$headerText}>
                <Text text={fullName} size="xl" weight="bold" />
                <View style={[themed($roleBadge), { backgroundColor: colors.tint + "1A" }]}>
                  <Text
                    text={user.role.toUpperCase()}
                    size="xs"
                    weight="bold"
                    style={{ color: colors.tint }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={themed($section)}>
            <Text tx="profileViewScreen:contactInformation" size="sm" weight="bold" style={$sectionTitle} />
            <View style={[themed($card), { backgroundColor: cardBgColor }, shadowStyle]}>
              <InfoRow
                icon={ChatBubbleLeftIcon}
                label={translate("common:email")}
                value={user.email}
                colors={colors}
              />
              <View style={[$divider, { backgroundColor: colors.border }]} />
              <InfoRow
                icon={PhoneIcon}
                label={translate("common:phone")}
                value={user.phone}
                colors={colors}
              />
            </View>
          </View>

          {/* Location Information */}
          <View style={themed($section)}>
            <Text tx="profileViewScreen:location" size="sm" weight="bold" style={$sectionTitle} />
            <View style={[themed($card), { backgroundColor: cardBgColor }, shadowStyle]}>
              <InfoRow
                icon={MapIcon}
                label={translate("profileViewScreen:address")}
                value={location}
                colors={colors}
              />
              {user.province && (
                <>
                  <View style={[$divider, { backgroundColor: colors.border }]} />
                  <InfoRow
                    icon={MapIcon}
                    label={translate("profileViewScreen:province")}
                    value={user.province}
                    colors={colors}
                  />
                </>
              )}
            </View>
          </View>

          {/* Personal Information */}
          <View style={themed($section)}>
            <Text tx="profileViewScreen:personalInformation" size="sm" weight="bold" style={$sectionTitle} />
            <View style={[themed($card), { backgroundColor: cardBgColor }, shadowStyle]}>
              <InfoRow
                icon={SparklesIcon}
                label={translate("profileViewScreen:dateOfBirth")}
                value={
                  user.date_of_birth
                    ? new Date(user.date_of_birth).toLocaleDateString("vi-VN")
                    : translate("profileViewScreen:notProvided")
                }
                colors={colors}
              />
              <View style={[$divider, { backgroundColor: colors.border }]} />
              <InfoRow
                icon={CheckCircleIcon}
                label={translate("profileViewScreen:username")}
                value={user.username}
                colors={colors}
              />
            </View>
          </View>

          {/* Account Metadata */}
          <View style={[themed($section), { marginBottom: 16 }]}>
            <Text tx="profileViewScreen:accountInformation" size="sm" weight="bold" style={$sectionTitle} />
            <View style={[themed($card), { backgroundColor: cardBgColor }, shadowStyle]}>
              <View style={$metadataRow}>
                <Text tx="profileViewScreen:created" size="xs" style={{ color: colors.textDim }} />
                <Text text={formattedDates.created} size="xs" />
              </View>
              <View style={[$divider, { backgroundColor: colors.border }]} />
              <View style={$metadataRow}>
                <Text tx="profileViewScreen:updated" size="xs" style={{ color: colors.textDim }} />
                <Text text={formattedDates.updated} size="xs" />
              </View>
            </View>
          </View>

          {/* Edit Bottom Action */}
          <Pressable
            style={({ pressed }) => [
              $largeEditButton,
              { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => navigation.navigate("ProfileEdit")}
          >
            <PencilSquareIcon size={20} color="#fff" strokeWidth={2.5} />
            <Text tx="components:userMenu.editProfile" size="sm" weight="bold" style={{ color: "#fff" }} />
          </Pressable>
        </>
      )}
    </Screen>
  )
}

// Styles
const $container: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
  paddingHorizontal: 12,
  paddingTop: 8,
  paddingBottom: 20,
})

const $headerBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 4,
  paddingVertical: 8,
  marginBottom: 12,
})

const $backButton: ViewStyle = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $centerContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $section: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 16,
})

const $sectionTitle: ViewStyle = {
  marginBottom: 8,
  marginLeft: 4,
}

const $card: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 14,
  padding: 14,
  marginBottom: 0,
})

const $cardShadow: ViewStyle = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
}

const $headerContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
}

const $avatarPlaceholder: ViewStyle = {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: "rgba(0, 0, 0, 0.05)",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
}

const $avatar: ImageStyle = {
  width: 60,
  height: 60,
  borderRadius: 30,
}

const $roleBadge: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-start",
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
  marginTop: 4,
})

const $headerText: ViewStyle = {
  flex: 1,
}

const $editButton: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
}

const $largeEditButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 16,
  paddingVertical: 12,
  marginTop: 8,
  marginBottom: 16,
}

const $infoRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 12,
  paddingVertical: 4,
}

const $iconWrapper: ViewStyle = {
  marginTop: 2,
  width: 32,
  height: 32,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
}

const $infoContent: ViewStyle = {
  flex: 1,
  justifyContent: "center",
}

const $divider: ViewStyle = {
  height: 1,
  backgroundColor: "rgba(0, 0, 0, 0.1)",
  marginVertical: 8,
}

const $metadataRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
}
