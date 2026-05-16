import { Image, ImageStyle, StyleProp, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

export interface AvatarProps {
  /**
   * The text or identifier to generate the face hash for.
   */
  hashToken: string
  /**
   * Size of the avatar. Defaults to 40.
   */
  size?: number
  /**
   * Additional style overrides for the container.
   */
  style?: StyleProp<ViewStyle>
  /**
   * Additional style overrides for the image.
   */
  imageStyle?: StyleProp<ImageStyle>
}

/**
 * Renders an avatar using facehash.dev based on a hash token.
 */
export function Avatar(props: AvatarProps) {
  const { hashToken, size = 40, style, imageStyle } = props
  const { theme } = useAppTheme()
  const { colors } = theme

  // URL encode the token to handle spaces and special characters.
  const imageUrl = `https://www.facehash.dev/api/face?hash=${encodeURIComponent(hashToken)}`

  const $containerStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.palette.neutral200, // placeholder background
      overflow: "hidden" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    style,
  ]

  const $imageStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    imageStyle,
  ]

  return (
    <View style={$containerStyle}>
      <Image source={{ uri: imageUrl }} style={$imageStyle} resizeMode="cover" />
    </View>
  )
}
