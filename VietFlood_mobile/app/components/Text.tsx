import { ReactNode, forwardRef, ForwardedRef } from "react"
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native"
import { TOptions } from "i18next"

import { Text as ReusableText } from "@/components/ui-reusables/text"
import { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import { typography } from "@/theme/typography"

const $sizeStyles = {
  xxxl: { lineHeight: 60, letterSpacing: -0.28 } satisfies TextStyle,
  xxl: { lineHeight: 44, letterSpacing: 0 } satisfies TextStyle,
  xl: { lineHeight: 50, letterSpacing: -0.374 } satisfies TextStyle,
  lg: { lineHeight: 32, letterSpacing: 0.196 } satisfies TextStyle,
  md: { lineHeight: 25, letterSpacing: 0.231 } satisfies TextStyle,
  sm: { lineHeight: 25, letterSpacing: -0.374 } satisfies TextStyle,
  xs: { lineHeight: 20, letterSpacing: -0.224 } satisfies TextStyle,
  xxs: { lineHeight: 16, letterSpacing: -0.12 } satisfies TextStyle,
  xxxs: { lineHeight: 14, letterSpacing: -0.08 } satisfies TextStyle,
} as const

type Sizes = keyof typeof $sizeStyles
type Weights = "normal" | "bold"
type Presets = "default" | "bold" | "heading" | "subheading" | "formLabel" | "formHelper"

export interface TextProps extends RNTextProps {
  tx?: TxKeyPath
  text?: string
  txOptions?: TOptions
  style?: StyleProp<TextStyle>
  preset?: Presets
  weight?: Weights
  size?: Sizes
  children?: ReactNode
}

/**
 * Text component that wraps React Native Reusables Text
 * Provides backward compatibility with custom Text API
 */
export const Text = forwardRef(function Text(props: TextProps, _ref: ForwardedRef<RNText>) {
  const {
    weight,
    size,
    tx,
    txOptions,
    text,
    children,
    style: $styleOverride,
    preset = "default",
    ...rest
  } = props

  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children

  // Map size to tailwind classes
  const sizeMap: Record<Sizes, string> = {
    xxxl: "text-4xl",
    xxl: "text-4xl",
    xl: "text-3xl",
    lg: "text-2xl",
    md: "text-lg",
    sm: "text-base",
    xs: "text-sm",
    xxs: "text-xs",
    xxxs: "text-[10px]",
  }

  // Map weight to tailwind classes
  const weightMap: Record<Weights, string> = {
    normal: "font-normal",
    bold: "font-bold",
  }

  const presetMap: Record<Presets, string> = {
    default: "text-base font-normal text-foreground",
    bold: "text-base font-bold text-foreground",
    heading: "text-4xl font-bold text-foreground",
    subheading: "text-lg font-bold text-foreground",
    formLabel: "text-sm font-bold text-foreground",
    formHelper: "text-xs text-muted-foreground",
  }

  const baseStyle: TextStyle = {
    fontFamily: typography.primary.normal,
  }

  const sizeStyle = size ? $sizeStyles[size] : undefined
  const presetStyle: Partial<Record<Presets, TextStyle>> = {
    heading: $sizeStyles.xxl,
    subheading: $sizeStyles.lg,
    formLabel: $sizeStyles.xs,
    formHelper: $sizeStyles.xxs,
  }
  const effectiveWeight =
    weight ??
    (preset === "heading" || preset === "subheading" || preset === "bold" || preset === "formLabel"
      ? "bold"
      : "normal")
  const fontWeightStyle: TextStyle = {
    fontFamily:
      effectiveWeight === "bold" ? typography.primary.semiBold : typography.primary.normal,
  }

  const className = cn(presetMap[preset], size && sizeMap[size], weight && weightMap[weight])

  return (
    <ReusableText
      className={className}
      style={[baseStyle, presetStyle[preset], sizeStyle, fontWeightStyle, $styleOverride]}
      {...rest}
    >
      {content}
    </ReusableText>
  )
})

Text.displayName = "Text"
