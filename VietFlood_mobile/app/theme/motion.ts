export const motionTiming = {
  quick: 180,
  moderate: 280,
  slow: 420,
  stagger: 70,
} as const

export const tabTransitionSpec = {
  animation: "timing" as const,
  config: {
    duration: motionTiming.moderate,
  },
}

export const pressSpringConfig = {
  damping: 16,
  mass: 0.85,
  stiffness: 220,
  overshootClamping: true,
} as const
