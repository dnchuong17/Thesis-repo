import { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle, useWindowDimensions } from "react-native"
import {
  BoltIcon,
  ChevronRightIcon,
  MapIcon,
  ShieldCheckIcon,
} from "react-native-heroicons/outline"
import Animated from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { createFadeInDown, createFadeInUp, softLayoutTransition } from "@/theme/motionPresets"
import type { ThemedStyle } from "@/theme/types"

const appVersion = require("../../package.json").version as string
const appLogo = require("../../assets/images/logo.png")

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors, isDark },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { height, width } = useWindowDimensions()

  const screenInnerStyle: ViewStyle = {
    minHeight: Math.max(640, height - insets.bottom),
    paddingTop: insets.top + 16,
  }
  const heroSurfaceStyle: ViewStyle = {
    minHeight: Math.max(460, height * 0.66),
  }
  const logoStageSize = Math.min(220, Math.max(168, width * 0.5))
  const logoStageStyle: ViewStyle = {
    width: logoStageSize,
    height: logoStageSize,
  }
  const logoImageStyle: ImageStyle = {
    width: logoStageSize * 0.58,
    height: logoStageSize * 0.58,
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["bottom"]}
      backgroundColor={colors.background}
      systemBarStyle={isDark ? "light" : "dark"}
      contentContainerStyle={themed($screenContent)}
    >
      <View style={[themed($screenInner), screenInnerStyle]}>
        <View style={[themed($heroSurface), heroSurfaceStyle]}>
          <View style={themed($heroGlowPrimary)} />
          <View style={themed($heroGlowSecondary)} />

          <View style={themed($heroContent)}>
            <Animated.View
              entering={createFadeInDown(1)}
              style={[themed($logoStage), logoStageStyle]}
            >
              <View style={themed($logoHalo)} />
              <View style={themed($logoFrame)}>
                <Image
                  source={appLogo}
                  resizeMode="contain"
                  style={[themed($logoImage), logoImageStyle]}
                />
              </View>
            </Animated.View>

            <Animated.View entering={createFadeInDown(2)} style={themed($heroCopy)}>
              <Text text="VietFlood" size="md" weight="bold" style={themed($brandName)} />
              <Text tx="welcomeScreen:headline" preset="heading" style={themed($headline)} />
              <Text tx="welcomeScreen:subcopy" size="xs" style={themed($subcopy)} />
            </Animated.View>

            <Animated.View entering={createFadeInDown(3)} style={themed($signalRow)}>
              <View style={themed($signalPill)}>
                <MapIcon size={16} color={colors.palette.primary500} />
                <Text
                  tx="welcomeScreen:liveOperations"
                  size="xxs"
                  weight="bold"
                  style={themed($signalText)}
                />
              </View>

              <View style={themed($signalPill)}>
                <ShieldCheckIcon size={16} color={colors.palette.success500} />
                <Text
                  tx="welcomeScreen:verifiedReports"
                  size="xxs"
                  weight="bold"
                  style={themed($signalText)}
                />
              </View>
            </Animated.View>
          </View>
        </View>

        <Animated.View entering={createFadeInUp(4)} style={themed($actionSection)}>
          <Animated.View
            entering={createFadeInUp(5)}
            layout={softLayoutTransition}
            style={themed($buttonStack)}
          >
            <Button onPress={() => navigation.navigate("Login")} style={themed($primaryCta)}>
              <View style={themed($ctaContent)}>
                <Text tx="welcomeScreen:getStarted" style={themed($primaryCtaText)} />
                <ChevronRightIcon size={18} color={colors.palette.neutral100} />
              </View>
            </Button>

            <Button
              labelTx="welcomeScreen:createAccount"
              variant="outline"
              onPress={() => navigation.navigate("Register")}
              style={themed($secondaryCta)}
            />
          </Animated.View>

          <Animated.View entering={createFadeInUp(6)} style={themed($versionBadge)}>
            <ShieldCheckIcon size={14} color={colors.textDim} />
            <Text
              text={`v${appVersion}`}
              size="xxs"
              weight="bold"
              style={themed($versionBadgeText)}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexGrow: 1,
  backgroundColor: colors.background,
})

const $screenInner: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
  paddingHorizontal: 16,
  paddingBottom: 20,
  justifyContent: "space-between",
  gap: 16,
})

const $heroSurface: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 32,
  paddingHorizontal: 20,
  paddingBottom: 24,
  borderWidth: 1,
  borderColor: isDark ? "rgba(175,195,224,0.14)" : "rgba(121,168,255,0.18)",
  backgroundColor: colors.header,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: isDark ? 0.24 : 0.14,
  shadowRadius: 28,
  elevation: 8,
})

const $heroGlowPrimary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 240,
  height: 240,
  borderRadius: 999,
  top: -96,
  right: -40,
  backgroundColor: colors.glowStrong,
})

const $heroGlowSecondary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: 999,
  bottom: -116,
  left: -64,
  backgroundColor: colors.glow,
})

const $statusPill: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  alignSelf: "flex-start",
  minHeight: 36,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: isDark ? "rgba(175,195,224,0.14)" : "rgba(121,168,255,0.16)",
  backgroundColor: isDark ? "rgba(12,23,41,0.76)" : "rgba(255,255,255,0.74)",
})

const $statusPillText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  letterSpacing: 0,
})

const $heroContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  paddingTop: 24,
})

const $logoStage: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  justifyContent: "center",
})

const $logoHalo: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 18,
  right: 18,
  bottom: 18,
  left: 18,
  borderRadius: 999,
  backgroundColor: colors.glowStrong,
})

const $logoFrame: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  flex: 1,
  alignSelf: "stretch",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  borderWidth: 1,
  borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(121,168,255,0.24)",
  backgroundColor: isDark ? "rgba(8,18,34,0.9)" : "rgba(255,255,255,0.96)",
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: isDark ? 0.2 : 0.12,
  shadowRadius: 24,
  elevation: 6,
})

const $logoImage: ThemedStyle<ImageStyle> = () => ({
  alignSelf: "center",
})

const $heroCopy: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  gap: 8,
})

const $brandName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  letterSpacing: 0,
})

const $headline: ThemedStyle<TextStyle> = ({ colors }) => ({
  maxWidth: 320,
  color: colors.textPrimary,
  textAlign: "center",
  fontSize: 30,
  lineHeight: 36,
  letterSpacing: 0,
})

const $subcopy: ThemedStyle<TextStyle> = ({ colors }) => ({
  maxWidth: 292,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 18,
  letterSpacing: 0,
})

const $signalRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
})

const $signalPill: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  minHeight: 40,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: isDark ? "rgba(175,195,224,0.14)" : "rgba(121,168,255,0.16)",
  backgroundColor: isDark ? "rgba(12,23,41,0.7)" : "rgba(255,255,255,0.74)",
})

const $signalText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  letterSpacing: 0,
})

const $actionSection: ThemedStyle<ViewStyle> = () => ({
  gap: 12,
})

const $buttonStack: ThemedStyle<ViewStyle> = () => ({
  gap: 8,
})

const $versionBadge: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  minHeight: 32,
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginTop: 15,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: isDark ? "rgba(175,195,224,0.14)" : "rgba(121,168,255,0.16)",
  backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
})

const $versionBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  letterSpacing: 0,
})

const $primaryCta: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 48,
  borderRadius: 16,
  backgroundColor: colors.palette.primary500,
})

const $secondaryCta: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 48,
  borderRadius: 16,
  borderColor: colors.border,
  backgroundColor: colors.surfaceRaised,
})

const $ctaContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
})

const $primaryCtaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 15,
  fontWeight: "700",
  letterSpacing: 0,
})
