// TODO: write documentation about fonts and typography along with guides on how to add custom fonts in own
// markdown file and add links from here

import { Platform } from "react-native"
import {
  Mulish_300Light as mulishLight,
  Mulish_400Regular as mulishRegular,
  Mulish_500Medium as mulishMedium,
  Mulish_600SemiBold as mulishSemiBold,
  Mulish_700Bold as mulishBold,
} from "@expo-google-fonts/mulish"

export const customFontsToLoad = {
  mulishLight,
  mulishRegular,
  mulishMedium,
  mulishSemiBold,
  mulishBold,
}

const fonts = {
  mulish: {
    // Cross-platform Google font.
    normal: "mulishRegular",
    semiBold: "mulishSemiBold",
  },
  helveticaNeue: {
    // iOS only font.
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: {
    // iOS only font.
    normal: "Courier",
  },
  sansSerif: {
    // Android only font.
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
  monospace: {
    // Android only font.
    normal: "monospace",
  },
}

export const typography = {
  /**
   * The fonts are available to use, but prefer using the semantic name.
   */
  fonts,
  /**
   * The primary font. Used in most places.
   */
  primary: fonts.mulish,
  /**
   * An alternate font used for perhaps titles and stuff.
   */
  secondary: Platform.select({ ios: fonts.helveticaNeue, android: fonts.sansSerif }),
  /**
   * Lets get fancy with a monospace font!
   */
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
}
