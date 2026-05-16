import { ReactElement, ReactNode } from "react"
import { View, ViewStyle, StyleProp, TextStyle, Pressable } from "react-native"

import { Text as ReusableText, TextClassContext } from "@/components/ui-reusables/text"
import { cn } from "@/lib/utils"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

function BaseCard({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "bg-card/95 border-primary/10 flex flex-col gap-6 rounded-3xl border py-6 shadow-sm shadow-primary/10",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn("flex flex-col gap-1.5 px-6", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof ReusableText>) {
  return (
    <ReusableText
      role="heading"
      aria-level={3}
      className={cn("font-bold leading-none", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof ReusableText>) {
  return <ReusableText className={cn("text-muted-foreground text-sm", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn("flex flex-row items-center px-6", className)} {...props} />
}

type Presets = "default" | "reversed"

interface CardProps {
  preset?: Presets
  verticalAlignment?: "top" | "center" | "space-between" | "force-footer-bottom"
  LeftComponent?: ReactElement
  RightComponent?: ReactElement
  heading?: string | ReactNode
  headingStyle?: StyleProp<TextStyle>
  HeadingComponent?: ReactElement
  content?: string | ReactNode
  contentStyle?: StyleProp<TextStyle>
  ContentComponent?: ReactElement
  footer?: string | ReactNode
  footerStyle?: StyleProp<TextStyle>
  FooterComponent?: ReactElement
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  className?: string
  children?: ReactNode
}

/**
 * Card component consolidated
 */
function Card(props: CardProps) {
  const {
    heading,
    headingStyle,
    HeadingComponent,
    content,
    contentStyle,
    ContentComponent,
    footer,
    footerStyle,
    FooterComponent,
    LeftComponent,
    RightComponent,
    children,
    style,
    className,
    onPress,
  } = props

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  const cardContent = (
    <BaseCard
      className={cn("flex-1", onPress && "active:opacity-90", className)}
      style={[themed($interactiveCard), style]}
    >
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            {HeadingComponent ? (
              HeadingComponent
            ) : heading ? (
              <CardTitle
                className="text-foreground"
                style={[{ color: colors.textPrimary }, headingStyle]}
              >
                {heading}
              </CardTitle>
            ) : null}
            {content && !ContentComponent && !children ? (
              <CardDescription style={[{ color: colors.textDim }, contentStyle]}>
                {content}
              </CardDescription>
            ) : null}
          </View>
          {RightComponent && <View className="ml-2">{RightComponent}</View>}
        </View>
      </CardHeader>
      <CardContent>
        {LeftComponent && <View className="mb-3">{LeftComponent}</View>}
        {ContentComponent ? ContentComponent : children}
      </CardContent>
      {footer || FooterComponent ? (
        <View className="border-t border-border px-4 py-3" style={themed($footerBorder)}>
          {FooterComponent ? (
            FooterComponent
          ) : (
            <ReusableText
              className="text-sm text-muted-foreground"
              style={[{ color: colors.textDim }, footerStyle]}
            >
              {footer}
            </ReusableText>
          )}
        </View>
      ) : null}
    </BaseCard>
  )

  if (onPress) {
    return <Pressable onPress={onPress}>{cardContent}</Pressable>
  }

  return cardContent
}

const $interactiveCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surfaceRaised,
  borderColor: colors.border,
  elevation: 3,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
})

const $footerBorder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderTopColor: colors.border,
})

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
