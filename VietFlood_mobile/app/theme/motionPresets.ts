import { FadeInDown, FadeInUp, LinearTransition, ReduceMotion } from "react-native-reanimated"

import { motionTiming, pressSpringConfig } from "./motion"

export const systemReduceMotion = ReduceMotion.System

export const softLayoutTransition = LinearTransition.springify()
  .damping(pressSpringConfig.damping)
  .mass(pressSpringConfig.mass)
  .stiffness(180)
  .reduceMotion(systemReduceMotion)

export const createFadeInDown = (index = 0, step: number = motionTiming.stagger) =>
  FadeInDown.duration(motionTiming.slow)
    .delay(index * step)
    .reduceMotion(systemReduceMotion)

export const createFadeInUp = (index = 0, step: number = motionTiming.stagger) =>
  FadeInUp.duration(motionTiming.slow)
    .delay(index * step)
    .reduceMotion(systemReduceMotion)
