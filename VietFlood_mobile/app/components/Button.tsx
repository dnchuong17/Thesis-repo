import { Platform, ActivityIndicator } from "react-native"
import { cva, type VariantProps } from "class-variance-authority"
import type { TOptions } from "i18next"

import { AnimatedButton } from "@/components/ui-reusables/AnimatedButton"
import { TextClassContext, Text } from "@/components/ui-reusables/text"
import type { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import { useAppTheme } from "@/theme/context"

const buttonVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 overflow-hidden rounded-2xl border shadow-none",
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border-primary/15 bg-primary active:bg-primary/90 shadow-sm shadow-primary/25",
          Platform.select({ web: "hover:bg-primary/90" }),
        ),
        primary: cn(
          "border-primary/15 bg-primary active:bg-primary/90 shadow-sm shadow-primary/25",
          Platform.select({ web: "hover:bg-primary/90" }),
        ),
        destructive: cn(
          "border-destructive/15 bg-destructive active:bg-destructive/90 dark:bg-destructive/70 shadow-sm shadow-black/20",
          Platform.select({
            web: "hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          }),
        ),
        outline: cn(
          "border-primary/10 bg-card/90 active:bg-secondary/80 dark:bg-card/90 dark:border-primary/15 dark:active:bg-secondary/70 shadow-sm shadow-primary/10",
          Platform.select({
            web: "hover:bg-secondary/80 dark:hover:bg-secondary/70",
          }),
        ),
        secondary: cn(
          "border-primary/10 bg-secondary active:bg-secondary/80 shadow-sm shadow-primary/10",
          Platform.select({ web: "hover:bg-secondary/80" }),
        ),
        ghost: cn(
          "border-transparent bg-transparent active:bg-secondary/70 dark:active:bg-secondary/50",
          Platform.select({ web: "hover:bg-secondary/70 dark:hover:bg-secondary/50" }),
        ),
        link: "",
      },
      size: {
        default: cn("h-12 px-5 py-3 sm:h-10", Platform.select({ web: "has-[>svg]:px-4" })),
        sm: cn(
          "h-10 gap-1.5 rounded-2xl px-4 sm:h-9",
          Platform.select({ web: "has-[>svg]:px-2.5" }),
        ),
        lg: cn("h-14 rounded-2xl px-6 sm:h-12", Platform.select({ web: "has-[>svg]:px-5" })),
        icon: "h-12 w-12 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

const buttonTextVariants = cva(
  cn(
    "text-foreground text-[15px] font-semibold",
    Platform.select({ web: "pointer-events-none transition-colors" }),
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        primary: "text-primary-foreground",
        destructive: "text-white",
        outline: cn(
          "group-active:text-accent-foreground",
          Platform.select({ web: "group-hover:text-accent-foreground" }),
        ),
        secondary: "text-secondary-foreground",
        ghost: "group-active:text-accent-foreground",
        link: cn(
          "text-primary group-active:underline",
          Platform.select({ web: "underline-offset-4 hover:underline group-hover:underline" }),
        ),
      },
      size: {
        default: "",
        sm: "",
        lg: "",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

interface ButtonProps
  extends
    Omit<React.ComponentProps<typeof AnimatedButton>, "children" | "variant">,
    VariantProps<typeof buttonVariants> {
  label?: string
  labelTx?: TxKeyPath
  labelTxOptions?: TOptions
  isLoading?: boolean
  children?: React.ReactNode
  accessibilityLabel?: string
}

function Button({
  className,
  variant,
  size,
  label,
  labelTx,
  labelTxOptions,
  isLoading,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const {
    theme: { colors },
  } = useAppTheme()

  const resolvedVariant = variant ?? "default"
  const resolvedLabel = labelTx ? translate(labelTx, labelTxOptions) : label

  const textColor =
    resolvedVariant === "outline" || resolvedVariant === "ghost" || resolvedVariant === "link"
      ? colors.textPrimary
      : resolvedVariant === "secondary"
        ? colors.buttonSecondaryText
        : colors.palette.neutral100

  const baseStyle = {
    borderRadius: 20,
    borderWidth: resolvedVariant === "ghost" || resolvedVariant === "link" ? 0 : 1,
  }

  const variantStyle =
    resolvedVariant === "outline"
      ? {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 2,
        }
      : resolvedVariant === "secondary"
        ? {
            backgroundColor: colors.buttonSecondary,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 2,
          }
        : resolvedVariant === "destructive"
          ? {
              backgroundColor: colors.error,
              borderColor: `${colors.error}33`,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.12,
              shadowRadius: 18,
              elevation: 3,
            }
          : resolvedVariant === "ghost" || resolvedVariant === "link"
            ? undefined
            : {
                backgroundColor: colors.buttonPrimary,
                borderColor: `${colors.buttonPrimary}2A`,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.14,
                shadowRadius: 22,
                elevation: 4,
              }

  // Map old variant names if necessary, but standard variants match legacy anyway.
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <AnimatedButton
        className={cn(
          (disabled || isLoading) && "opacity-50",
          buttonVariants({ variant, size }),
          className,
        )}
        style={[baseStyle, variantStyle, style]}
        disabled={disabled || isLoading}
        // @ts-expect-error - AnimatedButton types may omit accessibility props even though it's a Pressable
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel || resolvedLabel}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : resolvedLabel ? (
          <Text className="font-bold text-sm" style={{ color: textColor }}>
            {resolvedLabel}
          </Text>
        ) : (
          children
        )}
      </AnimatedButton>
    </TextClassContext.Provider>
  )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
