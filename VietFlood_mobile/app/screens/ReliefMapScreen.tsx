import { FC } from "react"
import { View, ViewStyle, Pressable } from "react-native"
import { ArrowLeftIcon } from "react-native-heroicons/outline"
import { WebView } from "react-native-webview"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ReliefMapScreenProps extends AppStackScreenProps<"ReliefMap"> {}

/**
 * ReliefMapScreen - Displays Windy weather/flood map for relief staff
 * Shows real-time weather conditions and flood monitoring for disaster response
 */
export const ReliefMapScreen: FC<ReliefMapScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
      safeAreaEdges={["top"]}
    >
      {/* Header */}
      <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            themed($backButton),
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text text="Bản đồ thời tiết và ngập lụt" size="lg" weight="bold" />
        <View style={{ width: 44 }} />
      </View>

      {/* Map Container */}
      <View style={themed($webviewContainer)}>
        <WebView
          source={{
            uri: "https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=6&overlay=wind&product=ecmwf&level=surface&lat=16.047&lon=108.206",
          }}
          style={$webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
})

const $webviewContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  overflow: "hidden",
  borderRadius: 0,
  backgroundColor: colors.background,
})

const $webview: ViewStyle = {
  flex: 1,
}
