import { FC, ReactNode } from "react"
import { View, ViewStyle, TextStyle } from "react-native"

import { useAuth } from "@/context/AuthContext"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

interface RoleBasedLayoutProps {
  children: ReactNode
  roleIcon?: ReactNode
  actionButtons?: ReactNode
  showHeader?: boolean
}

/**
 * RoleBasedLayout - Displays role-specific header and container
 *
 * RELIEF ROLE: Shows emergency/crisis resources focus
 * USER ROLE: Shows community reporting focus
 */
export const RoleBasedLayout: FC<RoleBasedLayoutProps> = ({
  children,
  roleIcon,
  actionButtons,
  showHeader = true,
}) => {
  const { authRole } = useAuth()
  const { themed } = useAppTheme()

  const isReliefRole = authRole === "relief" || authRole === "coordinator" || authRole === "admin"

  return (
    <View style={themed($container)}>
      {showHeader && (
        <View style={themed($headerContainer)}>
          <View style={themed($headerContent)}>
            {roleIcon && <View style={themed($iconContainer)}>{roleIcon}</View>}
            <View style={themed($titleContainer)}>
              <Text
                preset="heading"
                tx={
                  isReliefRole
                    ? "components:roleBasedLayout.reliefTitle"
                    : "components:roleBasedLayout.communityTitle"
                }
                style={themed($title)}
              />
              <Text
                tx={
                  isReliefRole
                    ? "components:roleBasedLayout.reliefSubtitle"
                    : "components:roleBasedLayout.communitySubtitle"
                }
                style={themed($subtitle)}
              />
            </View>
          </View>
          {actionButtons ? <View style={themed($actionsWrap)}>{actionButtons}</View> : null}
        </View>
      )}

      {/* Content area */}
      <View style={themed($content)}>{children}</View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $headerContainer: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  backgroundColor: isDark ? colors.palette.neutral900 : colors.palette.neutral100,
  borderBottomWidth: 1,
  borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
  paddingHorizontal: 16,
  paddingVertical: 12,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
})

const $headerContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
})

const $iconContainer: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
  justifyContent: "center",
  alignItems: "center",
})

const $titleContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontSize: 24,
  lineHeight: 30,
  letterSpacing: -0.374,
  marginBottom: 0,
})

const $subtitle: ThemedStyle<TextStyle> = ({ isDark }) => ({
  color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
  fontSize: 14,
  lineHeight: 20,
  marginTop: 0,
})

const $content: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $actionsWrap: ThemedStyle<ViewStyle> = () => ({
  marginLeft: 12,
  alignItems: "flex-end",
})
