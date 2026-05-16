export interface FeatureRolloutConfig {
  mobileLogicAlignment: boolean
  mobileFeatureParity: boolean
  mobileServiceIntegration: boolean
  authVerticalSlice: boolean
  reportsVerticalSlice: boolean
  reliefVerticalSlice: boolean
  volunteerVerticalSlice: boolean
  profileHomeVerticalSlice: boolean
  usersOverviewVerticalSlice: boolean
}

export const rolloutConfig: FeatureRolloutConfig = {
  mobileLogicAlignment: true,
  mobileFeatureParity: true,
  mobileServiceIntegration: true,
  authVerticalSlice: true,
  reportsVerticalSlice: true, // Parity: Reports with async state
  reliefVerticalSlice: true, // Parity: Map view with marker support
  volunteerVerticalSlice: false,
  profileHomeVerticalSlice: true, // Parity: Overview dashboard with metrics
  usersOverviewVerticalSlice: true, // Parity: Users tab/list from web dashboard
}

export function isCapabilityEnabled(capability: keyof FeatureRolloutConfig): boolean {
  return rolloutConfig[capability]
}
