/* eslint-disable import/first */
/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
if (__DEV__) {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "../global.css"
import "./utils/gestureHandler"

import { useEffect, useState } from "react"
import { useFonts } from "expo-font"
import * as Linking from "expo-linking"
import { PortalHost } from "@rn-primitives/portal"
import {
  ActivityIndicator,
  Image as RNImage,
  StyleSheet,
  Text as RNText,
  View as RNView,
} from "react-native"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"
import { Provider } from "react-redux"

import { AppToastViewport } from "./components/AppToastViewport"
import { AuthProvider } from "./context/AuthContext"
import { GlobalAlertProvider } from "./context/GlobalAlertContext"
import { initI18n } from "./i18n"
import vi from "./i18n/vi"
import { AppNavigator } from "./navigators/AppNavigator"
import { useNavigationPersistence } from "./navigators/navigationUtilities"
import { store } from "./store"
import { ThemeProvider } from "./theme/context"
import { customFontsToLoad } from "./theme/typography"
import { loadDateFnsLocale } from "./utils/formatDate"
import * as storage from "./utils/storage"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"

// Web linking configuration
const prefix = Linking.createURL("/")
const config = {
  screens: {
    Welcome: {
      path: "",
    },
    Login: {
      path: "login",
    },
    Register: {
      path: "register",
    },
    ProfileHome: "overview",
    UsersOverview: "users",
    Reports: "reports",
    Relief: "map",
    Volunteer: "volunteer",
  },
}

function LaunchSplash() {
  return (
    <RNView style={launchStyles.container}>
      <RNView style={launchStyles.brandLockup}>
        <RNView style={launchStyles.logoFrame}>
          <RNImage source={require("../assets/images/logo.png")} style={launchStyles.logo} />
        </RNView>
        <RNText style={launchStyles.brand}>VietFlood</RNText>
        <RNText style={launchStyles.subtitle}>{vi.app.launchSplash.subtitle}</RNText>
      </RNView>

      <RNView style={launchStyles.statusPanel}>
        <RNView style={launchStyles.statusRow}>
          <RNText style={launchStyles.statusLabel}>{vi.app.launchSplash.statusLabel}</RNText>
          <ActivityIndicator color="#60A5FA" />
        </RNView>
      </RNView>
    </RNView>
  )
}

/**
 * This is the root component of our app.
 * @param {AppProps} props - The props for the `App` component.
 * @returns {JSX.Element} The rendered `App` component.
 */
export function App() {
  const {
    initialNavigationState,
    onNavigationStateChange,
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  // Before we show the app, we have to wait for our state to be ready.
  // In the meantime, don't render anything. This will be the background
  // color set in native by rootView's background color.
  // In iOS: application:didFinishLaunchingWithOptions:
  // In Android: https://stackoverflow.com/a/45838109/204044
  // You can replace with your own loading component if you wish.
  if (!isNavigationStateRestored || !isI18nInitialized || (!areFontsLoaded && !fontLoadError)) {
    return <LaunchSplash />
  }

  const linking = {
    prefixes: [prefix],
    config,
  }

  // otherwise, we're ready to render the app
  return (
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={appStyles.root}>
          <KeyboardProvider>
            <AuthProvider>
              <ThemeProvider>
                <GlobalAlertProvider>
                  <AppNavigator
                    linking={linking}
                    initialState={initialNavigationState}
                    onStateChange={onNavigationStateChange}
                  />
                  <AppToastViewport />
                  <PortalHost />
                </GlobalAlertProvider>
              </ThemeProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Provider>
  )
}

const appStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
})

const launchStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 120,
    paddingBottom: 48,
    backgroundColor: "#060D18",
  },
  brandLockup: {
    alignItems: "center",
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(121,168,255,0.22)",
    backgroundColor: "rgba(17,27,47,0.82)",
    shadowColor: "#09111F",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 6,
  },
  logo: {
    width: 68,
    height: 68,
    resizeMode: "contain",
  },
  brand: {
    marginTop: 20,
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 4,
    color: "rgba(220,233,255,0.72)",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0,
  },
  statusPanel: {
    minHeight: 56,
    borderRadius: 24,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(91,149,255,0.18)",
    backgroundColor: "rgba(17,27,47,0.92)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  statusLabel: {
    flex: 1,
    color: "rgba(248,251,255,0.86)",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
})
