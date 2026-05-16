import { View, ViewStyle, TextStyle, TouchableOpacity } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { ExtendedEdge, useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

import { IconTypes, PressableIcon } from "./Icon"
import { Text } from "./Text"

export interface BrandedHeaderProps {
  /**
   * Title/brand name to display in center
   */
  title?: string
  /**
   * Icon that should appear on the left.
   */
  leftIcon?: IconTypes
  /**
   * What happens when you press the left icon.
   */
  onLeftPress?: () => void
  /**
   * Icon that should appear on the right.
   */
  rightIcon?: IconTypes
  /**
   * What happens when you press the right icon.
   */
  onRightPress?: () => void
  /**
   * An optional tint color for the left icon
   */
  leftIconColor?: string
  /**
   * An optional tint color for the right icon
   */
  rightIconColor?: string
  /**
   * Show badge on right icon (e.g., notification count)
   */
  badge?: number
  /**
   * Override the default edges for the safe area.
   */
  safeAreaEdges?: ExtendedEdge[]
}

/**
 * Modern glassmorphic branded header for main app navigation.
 * Features translucent frosted glass background with smooth blur effect.
 *
 * @param {BrandedHeaderProps} props - The props for the `BrandedHeader` component.
 * @returns {JSX.Element} The rendered `BrandedHeader` component.
 */
export function BrandedHeader(props: BrandedHeaderProps) {
  const {
    title = "VietFlood",
    leftIcon,
    onLeftPress,
    rightIcon,
    onRightPress,
    leftIconColor,
    rightIconColor,
    badge,
    safeAreaEdges = ["top"],
  } = props

  const {
    theme: { colors, isDark },
    themed,
  } = useAppTheme()

  const $containerInsets = useSafeAreaInsetsStyle(safeAreaEdges)

  const effectiveLeftIconColor =
    leftIconColor || (isDark ? colors.buttonPrimaryDark : colors.buttonPrimary)
  const effectiveRightIconColor =
    rightIconColor || (isDark ? colors.buttonPrimaryDark : colors.buttonPrimary)

  return (
    <View
      style={[
        themed($container),
        $containerInsets,
        { backgroundColor: isDark ? $darkGlass : $lightGlass },
      ]}
    >
      {/* Content layer with safe spacing */}
      <View style={themed($contentWrapper)}>
        {/* Left Action */}
        <View style={$actionContainer}>
          {leftIcon ? (
            <TouchableOpacity
              onPress={onLeftPress}
              disabled={!onLeftPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PressableIcon
                size={24}
                icon={leftIcon}
                color={effectiveLeftIconColor}
                containerStyle={themed($iconContainer)}
              />
            </TouchableOpacity>
          ) : (
            <View style={$iconPlaceholder} />
          )}
        </View>

        {/* Center Branding */}
        <View style={$brandContainer}>
          <Text
            text={title}
            size="xl"
            weight="bold"
            style={themed([$brandTitle, { color: colors.textPrimary }])}
          />
        </View>

        {/* Right Action with Badge */}
        <View style={$actionContainer}>
          {rightIcon ? (
            <TouchableOpacity
              onPress={onRightPress}
              disabled={!onRightPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={$iconWithBadge}>
                <PressableIcon
                  size={24}
                  icon={rightIcon}
                  color={effectiveRightIconColor}
                  containerStyle={themed($iconContainer)}
                />
                {badge !== undefined && badge > 0 && (
                  <View style={themed([$badgeContainer, { backgroundColor: colors.error }])}>
                    <Text
                      text={badge > 99 ? "99+" : badge.toString()}
                      size="xs"
                      weight="bold"
                      style={themed([$badgeText, { color: colors.palette.neutral100 }])}
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={$iconPlaceholder} />
          )}
        </View>
      </View>

      {/* Subtle top border for definition */}
      <View style={themed([$bottomBorder, { borderBottomColor: colors.palette.primary500 }])} />
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * Light mode glassmorphic background:
 * 60% neutral base (near-white), 30% depth from subtle transparency,
 * 10% accent via blue-tinted border below
 */
const $lightGlass = "rgba(255, 255, 255, 0.75)"

/**
 * Dark mode glassmorphic background:
 * Semi-transparent dark with slight blue tint for premium feel
 */
const $darkGlass = "rgba(15, 23, 42, 0.6)"

const $container: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  width: "100%",
  // Glassmorphic effect through translucent background
  // BlurView would enhance this further if expo-blur is available
})

const $contentWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  height: 56, // 44pt + comfortable padding
  position: "relative",
  zIndex: 2,
})

const $actionContainer: ViewStyle = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $iconContainer: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
}

const $iconPlaceholder: ViewStyle = {
  width: 44,
  height: 44,
}

const $brandContainer: ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  marginHorizontal: 16,
}

const $brandTitle: TextStyle = {
  textAlign: "center",
  letterSpacing: -0.5,
}

const $iconWithBadge: ViewStyle = {
  position: "relative",
}

const $badgeContainer: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 6,
})

const $badgeText: TextStyle = {
  textAlign: "center",
  lineHeight: 20,
}

const $bottomBorder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.primary500,
  opacity: 0.2,
})
