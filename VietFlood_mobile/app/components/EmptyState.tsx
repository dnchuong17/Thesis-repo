import { View, ViewStyle } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Button } from "./Button"
import { Text } from "./Text"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
  containerStyle?: ViewStyle
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
  containerStyle,
}) => {
  const {
    themed,
    theme: { colors, spacing },
  } = useAppTheme()

  return (
    <Animated.View
      style={[themed($container), containerStyle, style]}
      entering={FadeIn.duration(300)}
    >
      {icon && <View style={[themed($iconContainer), { marginBottom: spacing.lg }]}>{icon}</View>}

      <Text
        preset="heading"
        weight="bold"
        style={[themed($title), { marginBottom: spacing.sm, color: colors.textPrimary }]}
      >
        {title}
      </Text>

      <Text
        preset="default"
        style={[themed($description), { color: colors.textTertiary, marginBottom: spacing.lg }]}
      >
        {description}
      </Text>

      {actionLabel && onAction && (
        <View style={[themed($actionContainer), { marginTop: spacing.md }]}>
          <Button
            label={actionLabel}
            variant="primary"
            onPress={onAction}
            style={themed($actionBtn)}
          />
        </View>
      )}
    </Animated.View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: 48,
  borderRadius: 28,
})

const $iconContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginBottom: 24,
  justifyContent: "center",
  alignItems: "center",
  width: 72,
  height: 72,
  borderRadius: 24,
  backgroundColor: colors.statusInfoBackground,
})

const $title: ThemedStyle<ViewStyle> = () => ({
  textAlign: "center",
  marginBottom: 12,
})

const $description: ThemedStyle<ViewStyle> = () => ({
  textAlign: "center",
  marginBottom: 32,
  maxWidth: 320,
})

const $actionContainer: ThemedStyle<ViewStyle> = () => ({
  marginTop: 24,
  minHeight: 48,
})

const $actionBtn: ThemedStyle<ViewStyle> = () => ({
  minHeight: 48,
  justifyContent: "center",
  minWidth: 180,
})
