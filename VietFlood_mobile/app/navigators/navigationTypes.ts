import { ComponentProps } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { Report } from "@/services/api/types"

// App Stack Navigator types
export type AppStackParamList = {
  Welcome: undefined
  Login: undefined
  Register: undefined
  Reports: { openCreateModal?: boolean } | undefined
  Relief: undefined
  Volunteer: undefined
  ProfileHome: undefined
  ProfileView: undefined
  ProfileEdit: undefined
  UsersOverview: undefined
  Settings: { screen?: "Settings" | "ProfileView" | "ProfileEdit" } | undefined
  Windy: undefined
  ReliefMap: undefined
  ReliefReportsListScreen: { userId: string; userName?: string }
  ReliefReportDetailScreen: { reportId: string; report?: Report }
  ChangePasswordScreen: undefined
  UserGuideScreen: undefined
  // 🔥 Your screens go here
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
