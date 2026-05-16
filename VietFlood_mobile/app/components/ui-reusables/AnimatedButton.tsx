/**
 * Animated Button Component
 *
 * Wraps the base button with press animations:
 * - Scale down to 0.97x on press
 * - Scale back to 1x on release
 * - Smooth spring animation (200ms)
 * - Respects prefers-reduced-motion
 *
 * Used by: app/components/Button.tsx wrapper
 */

import { useRef } from "react"
import { Pressable, StyleProp, ViewStyle } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"

import { motionTiming, pressSpringConfig } from "@/theme/motion"

interface AnimatedButtonProps {
  children: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "outline" | "ghost"
  className?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onPress,
  disabled = false,
  className,
  style,
  testID,
}) => {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(disabled ? 0.5 : 1)
  const lastPressTime = useRef(0)
  const springConfig = { ...pressSpringConfig, reduceMotion: ReduceMotion.System }
  const timingConfig = { duration: motionTiming.quick, reduceMotion: ReduceMotion.System }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      // Optionally, add a subtle backgroundColor transition for focus/active
      // backgroundColor: isFocused ? 'rgba(0,0,0,0.04)' : 'transparent',
    }
  })

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.975, springConfig)
      opacity.value = withTiming(0.88, timingConfig)
    }
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig)
    opacity.value = withTiming(disabled ? 0.5 : 1, timingConfig)
  }

  const handlePress = () => {
    if (!onPress || disabled) {
      return
    }

    const now = Date.now()

    // Prevent rapid repeat taps without rejecting normal quick taps.
    if (now - lastPressTime.current < 250) {
      return
    }

    lastPressTime.current = now
    onPress()
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={() => {
        opacity.value = withTiming(0.92, timingConfig)
      }}
      onBlur={() => {
        opacity.value = withTiming(disabled ? 0.5 : 1, timingConfig)
      }}
      disabled={disabled}
      style={[animatedStyle, style]}
      className={className}
      testID={testID}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </AnimatedPressable>
  )
}
