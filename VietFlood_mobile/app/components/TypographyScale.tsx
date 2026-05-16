/**
 * TypographyScale Component
 *
 * A utility component that enforces the 4-level typography hierarchy:
 * - Level 1 (Primary): Display/Page titles - xl/xxl size, weight 700, opacity 100%
 * - Level 2 (Secondary): Section headings - lg/md size, weight 700, opacity 80%
 * - Level 3 (Tertiary): Body text - md/sm size, weight 400, opacity 80%
 * - Level 4 (Quaternary): Labels/helpers - xs/xxs size, weight 400, opacity 50%
 *
 * Usage:
 * <TypographyScale level="primary">Main Title</TypographyScale>
 * <TypographyScale level="secondary">Section Heading</TypographyScale>
 * <TypographyScale level="tertiary">Body text content</TypographyScale>
 * <TypographyScale level="quaternary">Helper text</TypographyScale>
 */

import { ReactNode } from "react"
import { TextStyle } from "react-native"

import { Text, TextProps } from "./Text"

export type TypographyLevel = "primary" | "secondary" | "tertiary" | "quaternary"

export interface TypographyScaleProps extends Omit<TextProps, "preset" | "size" | "weight"> {
  /**
   * The typography hierarchy level to apply
   * - primary: Display titles (xl/xxl, bold, 100% opacity)
   * - secondary: Section headings (lg/md, bold, 80% opacity)
   * - tertiary: Body text (md/sm, regular, 80% opacity)
   * - quaternary: Labels/helpers (xs/xxs, regular, 50% opacity)
   */
  level: TypographyLevel

  /**
   * Optional size override for the level (still respects weight/opacity)
   * If specified, overrides the default size for the level
   */
  size?: "xl" | "xxl" | "lg" | "md" | "sm" | "xs" | "xxs"

  children?: ReactNode
}

/**
 * Defines the typography scale for each hierarchy level
 * Each level specifies: size, weight, and opacity
 */
const typographyScale: Record<
  TypographyLevel,
  {
    size: "xl" | "xxl" | "lg" | "md" | "sm" | "xs" | "xxs"
    weight: "normal" | "bold"
    opacity: number // 1.0, 0.8, 0.5 for 100%, 80%, 50%
    description: string
  }
> = {
  primary: {
    size: "xxl",
    weight: "bold",
    opacity: 1.0,
    description: "Display/Page titles - maximum hierarchy emphasis",
  },
  secondary: {
    size: "lg",
    weight: "bold",
    opacity: 0.8,
    description: "Section headings - strong emphasis with reduced opacity",
  },
  tertiary: {
    size: "md",
    weight: "normal",
    opacity: 0.8,
    description: "Body text - readable content with good contrast",
  },
  quaternary: {
    size: "xs",
    weight: "normal",
    opacity: 0.5,
    description: "Labels/helpers - lowest hierarchy, minimal emphasis",
  },
}

/**
 * TypographyScale Component
 *
 * Simplifies typography hierarchy usage by providing semantic level-based
 * component that automatically applies correct size, weight, and opacity.
 *
 * @param {TypographyScaleProps} props - Component props
 * @returns {JSX.Element} Styled text component
 */
export function TypographyScale(props: TypographyScaleProps) {
  const { level, size: sizeOverride, children, style: styleOverride, ...rest } = props

  const scaleConfig = typographyScale[level]
  const effectiveSize = sizeOverride || scaleConfig.size

  // Apply opacity via style override
  const opacityStyle: TextStyle = {
    opacity: scaleConfig.opacity,
  }

  const combinedStyle = [opacityStyle, styleOverride]

  return (
    <Text size={effectiveSize} weight={scaleConfig.weight} style={combinedStyle} {...rest}>
      {children}
    </Text>
  )
}

/**
 * Helper hook to get typography scale config for a given level
 * Useful for applying typography rules in custom components
 *
 * @param {TypographyLevel} level - The hierarchy level
 * @returns {typeof typographyScale[TypographyLevel]} Scale config including size, weight, opacity
 */
export function useTypographyScale(level: TypographyLevel) {
  return typographyScale[level]
}

/**
 * Helper function to get opacity value for a typography level
 * Useful for applying consistent opacity to derived text styles
 *
 * @param {TypographyLevel} level - The hierarchy level
 * @returns {number} Opacity value (1.0, 0.8, or 0.5)
 */
export function getTypographyOpacity(level: TypographyLevel): number {
  return typographyScale[level].opacity
}

/**
 * Helper function to get size for a typography level
 *
 * @param {TypographyLevel} level - The hierarchy level
 * @returns {string} Size value (xxl, lg, md, xs, etc.)
 */
export function getTypographySize(level: TypographyLevel): string {
  return typographyScale[level].size
}

/**
 * Helper function to get weight for a typography level
 *
 * @param {TypographyLevel} level - The hierarchy level
 * @returns {"normal" | "bold"} Weight value
 */
export function getTypographyWeight(level: TypographyLevel): "normal" | "bold" {
  return typographyScale[level].weight
}

/**
 * Exports typography scale config for reference and documentation
 */
export const TYPOGRAPHY_SCALE = typographyScale
