import { FC, useEffect, useRef } from "react"
import { Animated, Pressable, TextStyle, ViewStyle } from "react-native"

import type { AlertPayload } from "@/context/GlobalAlertContext"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

interface GlobalAlertProps {
  alert?: AlertPayload
  onDismiss: () => void
}

export const GlobalAlert: FC<GlobalAlertProps> = ({ alert, onDismiss }) => {
  const {
    themed,
    theme: { colors, spacing },
  } = useAppTheme()
  const translateY = useRef(new Animated.Value(-90)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!alert) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -90,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()

      return
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 140,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start()
  }, [alert, opacity, translateY])

  if (!alert) return null

  const backgroundByVariant: Record<AlertPayload["variant"], string> = {
    success: colors.successBackground,
    error: colors.errorBackground,
    info: colors.statusInfoBackground,
  }

  const borderByVariant: Record<AlertPayload["variant"], string> = {
    success: `${colors.success}28`,
    error: `${colors.error}28`,
    info: `${colors.tint}28`,
  }

  const titleByVariant: Record<AlertPayload["variant"], string> = {
    success: colors.success,
    error: colors.error,
    info: colors.tint,
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        themed($container),
        {
          paddingTop: spacing.lg,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate("components:globalAlert.dismiss")}
        onPress={onDismiss}
        style={[
          themed($alertBox),
          {
            backgroundColor: backgroundByVariant[alert.variant],
            borderColor: borderByVariant[alert.variant],
          },
        ]}
      >
        {!!alert.title && (
          <Text
            text={alert.title}
            style={themed([$title, { color: titleByVariant[alert.variant] }])}
          />
        )}
        <Text text={alert.description} style={themed($description)} />
      </Pressable>
    </Animated.View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xxl,
  left: spacing.lg,
  right: spacing.lg,
  zIndex: 200,
})

const $alertBox: ThemedStyle<ViewStyle> = ({ spacing, shadows }) => ({
  borderRadius: 24,
  borderWidth: 1,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  minHeight: 52,
  justifyContent: "center",
  ...shadows.md,
})

const $title: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontFamily: typography.primary.semiBold,
  marginBottom: 2,
})

const $description: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
})
