/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { useEffect } from "react"
import { View, ViewStyle } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  HeartIcon,
  HandRaisedIcon,
  MapIcon,
  PlusIcon,
} from "react-native-heroicons/outline"

import Config from "@/config"
import { Header } from "@/components/Header"
import { useAuth } from "@/context/AuthContext"
import { ProfileViewScreen, ProfileEditScreen } from "@/features/profile"
import { isCapabilityEnabled } from "@/features/rollout"
import { translate } from "@/i18n/translate"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { LoginScreen } from "@/screens/LoginScreen"
import { ProfileHomeScreen } from "@/screens/ProfileHomeScreen"
import { RegisterScreen } from "@/screens/RegisterScreen"
import { ReliefReportDetailScreen } from "@/screens/ReliefReportDetailScreen"
import { ReliefScreen } from "@/screens/ReliefScreen"
import { ReportsScreen } from "@/screens/ReportsScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { UsersOverviewScreen } from "@/screens/UsersOverviewScreen"
import { VolunteerScreen } from "@/screens/VolunteerScreen"
import { WelcomeScreen } from "@/screens/WelcomeScreen"
import { WindyScreen } from "@/screens/WindyScreen"
import { useAppTheme } from "@/theme/context"
import { tabTransitionSpec } from "@/theme/motion"
import type { ThemedStyle } from "@/theme/types"

import { canAccessRoute, getInitialRouteName, resolveAccessibleRoute } from "./navigationGuard"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import {
  getActiveRouteName,
  navigationRef,
  resetRoot,
  useBackButtonHandler,
} from "./navigationUtilities"

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

// Documentation: https://reactnavigation.org/docs/bottom-tab-navigator/
const Tab = createBottomTabNavigator<AppStackParamList>()

// Settings Stack Navigator for nested navigation
const SettingsStack = createNativeStackNavigator<AppStackParamList>()

const SettingsStackNavigator = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen name="ProfileView" component={ProfileViewScreen} />
      <SettingsStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
    </SettingsStack.Navigator>
  )
}

const AppStack = () => {
  // Call all hooks at the top of the component before any conditional returns
  const { isAuthenticated, authRole, isHydrating } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  // Show public routes only before authentication is established
  const shouldShowPublicRoutes = !isAuthenticated || isHydrating

  // Authenticated routes - only show when not hydrating and user is authenticated
  const shouldShowAuthenticatedRoutes = isAuthenticated && !isHydrating

  // Determine initial route based on auth state and access control
  const preferredRoute = getInitialRouteName(isAuthenticated, authRole)

  // Build list of routes that will actually be rendered
  const renderableRoutes: string[] = []

  if (shouldShowPublicRoutes) {
    renderableRoutes.push("Welcome", "Login", "Register")
  }

  // Add authenticated routes when appropriate
  if (shouldShowAuthenticatedRoutes) {
    const isReliefRole = authRole === "relief" || authRole === "coordinator" || authRole === "admin"
    const isUserRole = authRole === "user" || authRole === "resident"

    // Relief role routes
    if (isReliefRole) {
      if (
        isCapabilityEnabled("reliefVerticalSlice") &&
        canAccessRoute("Relief", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Relief")
      }
      if (
        isCapabilityEnabled("reportsVerticalSlice") &&
        canAccessRoute("Reports", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Reports")
      }
      if (
        isCapabilityEnabled("volunteerVerticalSlice") &&
        canAccessRoute("Volunteer", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Volunteer")
      }
      if (
        isCapabilityEnabled("usersOverviewVerticalSlice") &&
        canAccessRoute("UsersOverview", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("UsersOverview")
      }
      if (canAccessRoute("Settings", isAuthenticated, authRole)) {
        renderableRoutes.push("Settings")
      }
    }

    // User role routes
    if (isUserRole) {
      if (canAccessRoute("Windy", isAuthenticated, authRole)) {
        renderableRoutes.push("Windy")
      }
      if (
        isCapabilityEnabled("reportsVerticalSlice") &&
        canAccessRoute("Reports", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Reports")
      }
      if (
        isCapabilityEnabled("profileHomeVerticalSlice") &&
        canAccessRoute("ProfileHome", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("ProfileHome")
      }
      if (canAccessRoute("Settings", isAuthenticated, authRole)) {
        renderableRoutes.push("Settings")
      }
    }

    // Fallback/Admin routes
    if (!isReliefRole && !isUserRole) {
      if (
        isCapabilityEnabled("profileHomeVerticalSlice") &&
        canAccessRoute("ProfileHome", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("ProfileHome")
      }
      if (
        isCapabilityEnabled("usersOverviewVerticalSlice") &&
        canAccessRoute("UsersOverview", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("UsersOverview")
      }
      if (
        isCapabilityEnabled("reportsVerticalSlice") &&
        canAccessRoute("Reports", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Reports")
      }
      if (
        isCapabilityEnabled("reliefVerticalSlice") &&
        canAccessRoute("Relief", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Relief")
      }
      if (
        isCapabilityEnabled("volunteerVerticalSlice") &&
        canAccessRoute("Volunteer", isAuthenticated, authRole)
      ) {
        renderableRoutes.push("Volunteer")
      }
      if (canAccessRoute("Settings", isAuthenticated, authRole)) {
        renderableRoutes.push("Settings")
      }
      if (canAccessRoute("Windy", isAuthenticated, authRole)) {
        renderableRoutes.push("Windy")
      }
    }
  }

  // Only set initialRouteName if the preferred route will actually be rendered
  const initialRouteName = isHydrating
    ? "Welcome"
    : renderableRoutes.includes(preferredRoute) && renderableRoutes.length > 0
      ? (preferredRoute as any)
      : renderableRoutes.length > 0
        ? (renderableRoutes[0] as any)
        : undefined

  const fallbackRoute = resolveAccessibleRoute(undefined, isAuthenticated, authRole)

  useEffect(() => {
    if (isHydrating || !navigationRef.isReady()) return

    const currentState = navigationRef.getRootState()
    if (!currentState?.routes?.length) return

    const currentRoute = getActiveRouteName(currentState) as keyof AppStackParamList
    const nextRoute = resolveAccessibleRoute(currentRoute, isAuthenticated, authRole)

    if (currentRoute === nextRoute) return
    if (!renderableRoutes.includes(nextRoute)) return

    resetRoot({
      index: 0,
      routes: [{ name: nextRoute }],
    })
  }, [authRole, fallbackRoute, isAuthenticated, isHydrating, renderableRoutes])

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textDim,
        animation: "fade",
        transitionSpec: tabTransitionSpec,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
        },
      }}
      {...(initialRouteName ? { initialRouteName } : {})}
    >
      {shouldShowPublicRoutes && (
        <>
          <Tab.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{
              tabBarStyle: { display: "none" },
              tabBarButton: () => null,
              tabBarItemStyle: { display: "none" },
            }}
          />
          <Tab.Screen
            name="Login"
            component={LoginScreen}
            options={{
              tabBarStyle: { display: "none" },
              tabBarButton: () => null,
              tabBarItemStyle: { display: "none" },
            }}
          />
          <Tab.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              tabBarStyle: { display: "none" },
              tabBarButton: () => null,
              tabBarItemStyle: { display: "none" },
            }}
          />
        </>
      )}

      {/* ========== RELIEF ROLE LAYOUT ========== */}
      {/* Relief coordinators focused on resource management and crisis response */}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        isCapabilityEnabled("reliefVerticalSlice") &&
        canAccessRoute("Relief", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Relief"
            component={ReliefScreen}
            options={{
              tabBarLabel: translate("navigation:resources"),
              tabBarIcon: ({ color, size }) => <HeartIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        isCapabilityEnabled("reportsVerticalSlice") &&
        canAccessRoute("Reports", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Reports"
            component={ReportsScreen}
            options={{
              tabBarLabel: translate("navigation:reports"),

              tabBarIcon: ({ color, size }) => <DocumentTextIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        canAccessRoute("ReliefReportDetailScreen", isAuthenticated, authRole) && (
          <Tab.Screen
            name="ReliefReportDetailScreen"
            component={ReliefReportDetailScreen}
            options={{
              tabBarStyle: { display: "none" },
              tabBarButton: () => null,
              tabBarItemStyle: { display: "none" },
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        isCapabilityEnabled("volunteerVerticalSlice") &&
        canAccessRoute("Volunteer", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Volunteer"
            component={VolunteerScreen}
            options={{
              tabBarLabel: translate("navigation:team"),
              tabBarIcon: ({ color, size }) => <HandRaisedIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        isCapabilityEnabled("usersOverviewVerticalSlice") &&
        canAccessRoute("UsersOverview", isAuthenticated, authRole) && (
          <Tab.Screen
            name="UsersOverview"
            component={UsersOverviewScreen}
            options={{
              tabBarLabel: translate("navigation:users"),
              tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        canAccessRoute("Settings", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Settings"
            component={SettingsStackNavigator}
            options={{
              tabBarLabel: translate("navigation:profile"),
              tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
            }}
          />
        )}

      {/* ========== USER ROLE LAYOUT ========== */}
      {/* Regular users/residents focused on reporting and information */}
      {shouldShowAuthenticatedRoutes &&
        (authRole === "user" || authRole === "resident") &&
        canAccessRoute("Windy", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Windy"
            component={WindyScreen}
            options={{
              tabBarLabel: translate("navigation:map"),
              tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
            }}
          />
        )}

      {shouldShowAuthenticatedRoutes &&
        (authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("reportsVerticalSlice") &&
        canAccessRoute("Reports", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Reports"
            component={ReportsScreen}
            options={{
              tabBarShowLabel: false,
              tabBarIcon: () => (
                <View style={themed($floatingCreateTabIcon)}>
                  <PlusIcon color={colors.palette.neutral100} size={32} />
                </View>
              ),
            }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault()
                navigation.navigate("Reports", { openCreateModal: true })
              },
            })}
          />
        )}

      {shouldShowAuthenticatedRoutes &&
        (authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("profileHomeVerticalSlice") &&
        canAccessRoute("ProfileHome", isAuthenticated, authRole) && (
          <Tab.Screen
            name="ProfileHome"
            component={ProfileHomeScreen}
            options={{
              headerShown: true,
              header: ({ navigation }) => (
                <Header
                  titleTx="navigation:profile"
                  rightIcon="settings"
                  onRightPress={() => navigation.navigate("Settings")}
                />
              ),
              tabBarLabel: translate("navigation:personal"),
              tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
            }}
          />
        )}

      {shouldShowAuthenticatedRoutes &&
        (authRole === "user" || authRole === "resident") &&
        canAccessRoute("Settings", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Settings"
            component={SettingsStackNavigator}
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: { display: "none" },
              tabBarLabel: translate("navigation:settings"),
            }}
          />
        )}

      {/* ========== FALLBACK / ADMIN LAYOUT ========== */}
      {/* Show all tabs for admin/coordinator with full access */}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("profileHomeVerticalSlice") &&
        canAccessRoute("ProfileHome", isAuthenticated, authRole) && (
          <Tab.Screen
            name="ProfileHome"
            component={ProfileHomeScreen}
            options={{
              headerShown: true,
              header: ({ navigation }) => (
                <Header
                  titleTx="navigation:profile"
                  rightIcon="settings"
                  onRightPress={() => navigation.navigate("Settings")}
                />
              ),
              tabBarLabel: translate("navigation:home"),
              tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("usersOverviewVerticalSlice") &&
        canAccessRoute("UsersOverview", isAuthenticated, authRole) && (
          <Tab.Screen
            name="UsersOverview"
            component={UsersOverviewScreen}
            options={{
              tabBarLabel: translate("navigation:users"),
              tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("reportsVerticalSlice") &&
        canAccessRoute("Reports", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Reports"
            component={ReportsScreen}
            options={{
              tabBarLabel: translate("navigation:reports"),
              tabBarIcon: ({ color, size }) => <DocumentTextIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("reliefVerticalSlice") &&
        canAccessRoute("Relief", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Relief"
            component={ReliefScreen}
            options={{
              tabBarLabel: translate("navigation:relief"),
              tabBarIcon: ({ color, size }) => <HeartIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        isCapabilityEnabled("volunteerVerticalSlice") &&
        canAccessRoute("Volunteer", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Volunteer"
            component={VolunteerScreen}
            options={{
              tabBarLabel: translate("navigation:volunteer"),
              tabBarIcon: ({ color, size }) => <HandRaisedIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        canAccessRoute("Windy", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Windy"
            component={WindyScreen}
            options={{
              tabBarLabel: translate("navigation:map"),
              tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
            }}
          />
        )}
      {shouldShowAuthenticatedRoutes &&
        !(authRole === "relief" || authRole === "coordinator" || authRole === "admin") &&
        !(authRole === "user" || authRole === "resident") &&
        canAccessRoute("Settings", isAuthenticated, authRole) && (
          <Tab.Screen
            name="Settings"
            component={SettingsStackNavigator}
            options={{
              tabBarLabel: translate("navigation:profile"),
              tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
            }}
          />
        )}
    </Tab.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}

const $floatingCreateTabIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
  top: -15,
  borderWidth: 1,
  borderColor: `${colors.palette.primary300}35`,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.24,
  shadowRadius: 20,
  elevation: 8,
})
