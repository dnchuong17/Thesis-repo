import { View, ViewStyle } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export type SkeletonShape = "card" | "list-item" | "paragraph"

interface LoadingSkeletonProps {
  shape?: SkeletonShape
  count?: number
  loadingText?: string
  style?: ViewStyle
  containerStyle?: ViewStyle
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  shape = "card",
  count = 2,
  loadingText,
  style,
  containerStyle,
}) => {
  const {
    themed,
    theme: { colors, spacing },
  } = useAppTheme()

  const renderSkeletonShape = (index: number) => {
    const key = `skeleton-${shape}-${index}`

    switch (shape) {
      case "card":
        return (
          <Animated.View
            key={key}
            style={[
              themed($skeletonCard),
              { marginBottom: spacing.md, backgroundColor: colors.palette.neutral200 },
            ]}
            entering={FadeIn.delay(index * 100).duration(300)}
          />
        )

      case "list-item":
        return (
          <Animated.View
            key={key}
            style={[
              themed($listItemContainer),
              {
                marginBottom: spacing.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
            entering={FadeIn.delay(index * 100).duration(300)}
          >
            <View
              style={[themed($skeletonAvatar), { backgroundColor: colors.palette.neutral200 }]}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View
                style={[
                  themed($skeletonLine),
                  { width: "80%", backgroundColor: colors.palette.neutral200 },
                ]}
              />
              <View
                style={[
                  themed($skeletonLine),
                  {
                    width: "60%",
                    marginTop: spacing.xs,
                    backgroundColor: colors.palette.neutral200,
                  },
                ]}
              />
            </View>
          </Animated.View>
        )

      case "paragraph":
        return (
          <Animated.View
            key={key}
            style={[themed($paragraphContainer), { marginBottom: spacing.lg }]}
            entering={FadeIn.delay(index * 100).duration(300)}
          >
            <View style={[themed($skeletonLine), { backgroundColor: colors.palette.neutral200 }]} />
            <View
              style={[
                themed($skeletonLine),
                { width: "95%", marginTop: spacing.xs, backgroundColor: colors.palette.neutral200 },
              ]}
            />
            <View
              style={[
                themed($skeletonLine),
                { width: "90%", marginTop: spacing.xs, backgroundColor: colors.palette.neutral200 },
              ]}
            />
          </Animated.View>
        )

      default:
        return (
          <Animated.View
            key={key}
            style={[
              themed($skeletonCard),
              { marginBottom: spacing.md, backgroundColor: colors.palette.neutral200 },
            ]}
            entering={FadeIn.delay(index * 100).duration(300)}
          />
        )
    }
  }

  return (
    <Animated.View
      style={[themed($container), containerStyle, style]}
      entering={FadeIn.duration(300)}
    >
      {loadingText && (
        <Text
          text={loadingText}
          size="sm"
          weight="bold"
          style={{ color: colors.textTertiary, marginBottom: spacing.md }}
        />
      )}
      <View style={themed($skeletonsContainer)}>
        {Array.from({ length: count }).map((_, index) => renderSkeletonShape(index))}
      </View>
    </Animated.View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
})

const $skeletonsContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $skeletonCard: ThemedStyle<ViewStyle> = () => ({
  height: 160,
  borderRadius: 12,
  overflow: "hidden",
})

const $skeletonLine: ThemedStyle<ViewStyle> = () => ({
  height: 14,
  borderRadius: 4,
})

const $listItemContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
})

const $skeletonAvatar: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  borderRadius: 22,
})

const $paragraphContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xs,
})
