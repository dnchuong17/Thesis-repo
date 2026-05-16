/**
 * Typography Hierarchy Component
 *
 * Enforces the 4-level typography hierarchy:
 * - primary: xl-xxl, 700, 100% (main titles)
 * - secondary: lg-md, 700, 100% (section headings)
 * - tertiary: md-sm, 400, 80% (body text)
 * - quaternary: xs-xxs, 400, 50% (labels/helpers)
 */
import { type AccessibilityRole, TextProps } from "react-native"

import { Text } from "@/components/ui-reusables/text"
import { cn } from "@/lib/utils"

type TypographyLevel = "primary" | "secondary" | "tertiary" | "quaternary"

interface TypographyProps extends Omit<TextProps, "children"> {
  /**
   * Hierarchy level (enforces size, weight, opacity)
   */
  level: TypographyLevel
  children: React.ReactNode
  /**
   * Optional class override (applied after level styles)
   */
  className?: string
}

/**
 * Typography component that enforces the 4-level hierarchy
 *
 * @example
 * // Primary level (large title)
 * <Typography level="primary">Main Title</Typography>
 *
 * @example
 * // Tertiary level (body text)
 * <Typography level="tertiary">Description paragraph</Typography>
 *
 * @example
 * // Quaternary level (label)
 * <Typography level="quaternary">Updated 2h ago</Typography>
 */
export const Typography: React.FC<TypographyProps> = ({ level, children, className, ...props }) => {
  const levelStyles: Record<TypographyLevel, string> = {
    // Level 1: Primary display (xl-xxl, 700, 100%)
    primary: cn("text-3xl font-bold text-foreground", "leading-tight"),
    // Level 2: Secondary heading (lg-md, 700, 100%)
    secondary: cn("text-lg font-bold text-foreground", "leading-snug"),
    // Level 3: Tertiary body (md-sm, 400, 80%)
    tertiary: cn("text-base font-normal text-foreground/80", "leading-relaxed"),
    // Level 4: Quaternary label (xs-xxs, 400, 50%)
    quaternary: cn("text-xs font-normal text-foreground/50", "leading-snug"),
  }

  const roleMap: Record<TypographyLevel, AccessibilityRole> = {
    primary: "header",
    secondary: "header",
    tertiary: "text",
    quaternary: "text",
  }

  return (
    <Text
      role={roleMap[level] as any}
      className={cn(levelStyles[level], className)}
      accessibilityRole={roleMap[level]}
      {...props}
    >
      {children}
    </Text>
  )
}

export default Typography
