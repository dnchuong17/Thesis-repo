import { borderRadii } from "./borderRadii"
import { colors as colorsLight } from "./colors"
import { colors as colorsDark } from "./colorsDark"
import { shadows } from "./shadows"
import { spacing as spacingLight } from "./spacing"
import { spacing as spacingDark } from "./spacingDark"
import { timing } from "./timing"
import type { Theme } from "./types"
import { typography } from "./typography"

// Here we define our themes.
export const lightTheme: Theme = {
  colors: colorsLight,
  spacing: spacingLight,
  typography,
  timing,
  shadows,
  borderRadii,
  isDark: false,
}
export const darkTheme: Theme = {
  colors: colorsDark,
  spacing: spacingDark,
  typography,
  timing,
  shadows,
  borderRadii,
  isDark: true,
}
