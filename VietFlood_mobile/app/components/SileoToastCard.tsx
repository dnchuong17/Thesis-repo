import { FC } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import type { Toast } from "@backpackapp-io/react-native-toast"
import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "react-native-heroicons/solid"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export type SileoToastVariant = "success" | "error" | "info" | "warning"

export interface SileoToastCardProps {
  toast: Toast
  title?: string
  description: string
  variant: SileoToastVariant
}

export const SileoToastCard: FC<SileoToastCardProps> = ({
  toast,
  title,
  description,
  variant,
}) => {
  const {
    themed,
    theme: { colors, spacing, shadows, isDark },
  } = useAppTheme()

  const paletteByVariant = {
    success: {
      tint: colors.success,
      bg: colors.statusSuccessBackground,
      glow: isDark ? "rgba(52, 211, 153, 0.26)" : "rgba(16, 185, 129, 0.18)",
      badge: colors.success,
    },
    error: {
      tint: colors.error,
      bg: colors.statusErrorBackground,
      glow: isDark ? "rgba(248, 113, 113, 0.24)" : "rgba(239, 68, 68, 0.18)",
      badge: colors.error,
    },
    info: {
      tint: colors.tint,
      bg: colors.statusInfoBackground,
      glow: isDark ? "rgba(91, 149, 255, 0.24)" : "rgba(29, 99, 242, 0.16)",
      badge: colors.tint,
    },
    warning: {
      tint: colors.warning,
      bg: colors.statusWarningBackground,
      glow: isDark ? "rgba(251, 191, 36, 0.24)" : "rgba(245, 158, 11, 0.16)",
      badge: colors.warning,
    },
  }[variant]

  const Icon =
    variant === "success"
      ? CheckBadgeIcon
      : variant === "error"
        ? ExclamationTriangleIcon
        : variant === "warning"
          ? ExclamationTriangleIcon
          : InformationCircleIcon

  return (
    <View
      style={[
        themed($shell),
        {
          width: toast.width,
        },
      ]}
    >
      <View style={[themed($glowOrb), { backgroundColor: paletteByVariant.glow }]} />
      <View style={[themed($glowOrbSecondary), { backgroundColor: paletteByVariant.glow }]} />

      <View
        style={[
          themed($card),
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: `${paletteByVariant.tint}2E`,
            ...shadows.md,
          },
        ]}
      >
        <View style={[themed($accentRail), { backgroundColor: paletteByVariant.badge }]} />

        <View
          style={[
            themed($badgeWrap),
            {
              backgroundColor: paletteByVariant.bg,
              borderColor: `${paletteByVariant.tint}30`,
            },
          ]}
        >
          <Icon color={paletteByVariant.badge} size={18} />
        </View>

        <View style={themed($copyWrap)}>
          {!!title && (
            <Text
              text={title}
              size="xs"
              weight="bold"
              style={[themed($title), { color: colors.textPrimary }]}
            />
          )}
          <Text
            text={description}
            size="xxs"
            style={[themed($description), { color: colors.textSecondary }]}
          />
        </View>

        <View style={[themed($pulseDot), { backgroundColor: paletteByVariant.badge }]} />
      </View>
    </View>
  )
}

const $shell: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "relative",
  paddingHorizontal: spacing.xxs,
  paddingTop: spacing.xxs,
})

const $glowOrb: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 6,
  left: 36,
  width: 72,
  height: 72,
  borderRadius: 999,
  opacity: 0.9,
})

const $glowOrbSecondary: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  right: 28,
  bottom: 4,
  width: 56,
  height: 56,
  borderRadius: 999,
  opacity: 0.45,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 72,
  borderRadius: 24,
  borderWidth: 1,
  paddingLeft: spacing.xs,
  paddingRight: spacing.sm,
  paddingVertical: spacing.xs,
  flexDirection: "row",
  alignItems: "center",
  overflow: "hidden",
})

const $accentRail: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  left: 0,
  top: 10,
  bottom: 10,
  width: 4,
  borderRadius: 999,
})

const $badgeWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 16,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.xs,
})

const $copyWrap: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $title: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontFamily: typography.primary.semiBold,
  marginBottom: 2,
})

const $description: ThemedStyle<TextStyle> = () => ({
  lineHeight: 18,
})

const $pulseDot: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 999,
  marginLeft: 8,
  opacity: 0.92,
})
