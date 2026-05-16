import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { WebView } from "react-native-webview"

import { Screen } from "@/components/Screen"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface WindyScreenProps extends AppStackScreenProps<"Windy"> {}

export const WindyScreen: FC<WindyScreenProps> = () => {
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
      <View style={themed($webviewContainer)}>
        <WebView
          source={{
            uri: "https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=16.047&lon=108.206",
          }}
          style={$webview}
        />
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $webviewContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  overflow: "hidden",
  borderRadius: 12,
  margin: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
})

const $webview: ViewStyle = {
  flex: 1,
}
