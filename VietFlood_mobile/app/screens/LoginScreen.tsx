import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
// eslint-disable-next-line no-restricted-imports
import { TextInput, TextStyle, TouchableOpacity, ViewStyle } from "react-native"
import { View, useWindowDimensions } from "react-native"
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/Button"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { useGlobalAlert } from "@/context/GlobalAlertContext"
import { translate } from "@/i18n/translate"
import { getInitialRouteName } from "@/navigators/navigationGuard"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { requestAndWarmReportLocationPrefill } from "@/utils/reportLocationPrefill"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
  const authPasswordInput = useRef<TextInput>(null)

  const [usernameInput, setUsernameInput] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [usernameError, setUsernameError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [usernameLiveValidation, setUsernameLiveValidation] = useState(false)
  const [passwordLiveValidation, setPasswordLiveValidation] = useState(false)
  const [shouldSaveSession, setShouldSaveSession] = useState(true)
  const { showAlert } = useGlobalAlert()
  const { loginWithPassword, authStatus, authMessage } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()

  useEffect(() => {
    if (authStatus === "error") {
      showAlert({
        title: translate("loginScreen:alertErrorTitle"),
        description: authMessage || translate("loginScreen:alertErrorFallback"),
        variant: "error",
      })
    }
  }, [authMessage, authStatus, showAlert])

  const isLoading = authStatus === "pending"
  const hasError = authStatus === "error"

  const validateUsername = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return translate("loginScreen:validations.usernameRequired")
    if (normalized.length < 3) return translate("loginScreen:validations.usernameMinLength")
    if (!/^[a-zA-Z0-9_-]+$/.test(normalized))
      return translate("loginScreen:validations.usernameCharset")
    return ""
  }

  const validatePassword = (value: string) => {
    if (!value) return translate("loginScreen:validations.passwordRequired")
    if (value.length < 6) return translate("loginScreen:validations.passwordMinLength")
    return ""
  }

  useEffect(() => {
    if (!usernameLiveValidation) return
    if (!usernameInput || usernameInput.trim().length < 3) {
      if (usernameError) setUsernameError("")
      return
    }

    const timeout = setTimeout(() => {
      setUsernameError(validateUsername(usernameInput))
    }, 300)

    return () => clearTimeout(timeout)
  }, [usernameError, usernameInput, usernameLiveValidation])

  useEffect(() => {
    if (!passwordLiveValidation) return
    if (!authPassword || authPassword.length < 3) {
      if (passwordError) setPasswordError("")
      return
    }

    const timeout = setTimeout(() => {
      setPasswordError(validatePassword(authPassword))
    }, 300)

    return () => clearTimeout(timeout)
  }, [authPassword, passwordError, passwordLiveValidation])

  const hasValidationErrors = Boolean(usernameError || passwordError)

  async function login() {
    setUsernameLiveValidation(true)
    setPasswordLiveValidation(true)

    const nextUsernameError = validateUsername(usernameInput)
    const nextPasswordError = validatePassword(authPassword)
    setUsernameError(nextUsernameError)
    setPasswordError(nextPasswordError)

    if (nextUsernameError || nextPasswordError) return

    const userRole = await loginWithPassword(usernameInput, authPassword, shouldSaveSession)
    if (!userRole) return

    const nextRoute = getInitialRouteName(true, userRole)

    showAlert({
      title: translate("loginScreen:alertSuccessTitle"),
      description: translate("loginScreen:alertSuccessDescription"),
      variant: "success",
    })

    navigation.reset({
      index: 0,
      routes: [{ name: nextRoute }],
    })

    void requestAndWarmReportLocationPrefill()

    setAuthPassword("")
    setUsernameInput("")
  }

  const PasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.text}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)}
          />
        )
      },
    [isAuthPasswordHidden, colors.text],
  )

  return (
    <Screen
      preset="scroll"
      backgroundColor={colors.background}
      systemBarStyle="light"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["bottom"]}
    >
      <View
        style={[
          themed($header),
          { paddingTop: insets.top + 16, minHeight: Math.max(208, height * 0.27) },
        ]}
      >
        <View style={themed($headerGlowPrimary)} />
        <View style={themed($headerGlowSecondary)} />

        <Animated.View entering={FadeInDown.duration(500)} style={themed($topRow)}>
          <TouchableOpacity
            accessibilityLabel={translate("loginScreen:backAccessibility")}
            onPress={() => navigation.navigate("Welcome")}
            style={themed($backIconWrap)}
          >
            <ChevronLeftIcon size={18} color={colors.palette.neutral100} />
          </TouchableOpacity>
          <View style={themed($headerSpacer)} />
          <Text size="xxs" tx="loginScreen:noAccount" style={themed($topHint)} />
          <Button
            variant="ghost"
            onPress={() => navigation.navigate("Register")}
            style={themed($topButton)}
          >
            <Text
              tx="loginScreen:registerAction"
              size="xxs"
              weight="bold"
              style={themed($topButtonText)}
            />
          </Button>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={themed($headerCopy)}>
          <View style={themed($productPill)}>
            <LockClosedIcon size={14} color={colors.palette.primary300} />
            <Text
              tx="loginScreen:secureAccess"
              size="xxs"
              weight="bold"
              style={themed($productPillText)}
            />
          </View>
          <Text tx="loginScreen:headerTitle" preset="heading" style={themed($headerTitle)} />
          <Text tx="loginScreen:headerSubtitle" size="sm" style={themed($headerSubtitle)} />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(140)} style={themed($formSection)}>
        <View style={themed($formHeader)}>
          <View style={themed($formIcon)}>
            <UserCircleIcon size={20} color={colors.palette.primary500} />
          </View>
          <View style={themed($formHeaderText)}>
            <Text
              testID="login-heading"
              tx="loginScreen:welcomeBack"
              preset="heading"
              style={themed($title)}
            />
            <Text tx="loginScreen:accountHint" size="sm" style={themed($subtitle)} />
          </View>
        </View>

        {hasError && authMessage && (
          <Text text={authMessage} size="sm" weight="bold" style={themed($errorMessage)} />
        )}

        <View style={themed($fields)}>
          <TextField
            value={usernameInput}
            onChangeText={(value) => {
              setUsernameInput(value)
            }}
            onBlur={() => {
              setUsernameLiveValidation(true)
              setUsernameError(validateUsername(usernameInput))
            }}
            containerStyle={themed($textField)}
            inputWrapperStyle={themed($inputWrapper)}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            keyboardType="default"
            labelTx="loginScreen:usernameLabel"
            placeholderTx="loginScreen:usernamePlaceholder"
            textContentType="none"
            errorMessage={usernameError}
            validationState={
              usernameError
                ? "error"
                : usernameLiveValidation && !usernameError && !!usernameInput
                  ? "success"
                  : "none"
            }
            onSubmitEditing={() => authPasswordInput.current?.focus()}
            editable={!isLoading}
          />

          <TextField
            ref={authPasswordInput}
            value={authPassword}
            onChangeText={(value) => {
              setAuthPassword(value)
            }}
            onBlur={() => {
              setPasswordLiveValidation(true)
              setPasswordError(validatePassword(authPassword))
            }}
            containerStyle={themed($textField)}
            inputWrapperStyle={themed($inputWrapper)}
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            secureTextEntry={isAuthPasswordHidden}
            labelTx="loginScreen:passwordLabel"
            placeholderTx="loginScreen:passwordPlaceholder"
            errorMessage={passwordError}
            validationState={
              passwordError
                ? "error"
                : passwordLiveValidation && !passwordError && !!authPassword
                  ? "success"
                  : "none"
            }
            onSubmitEditing={() => {
              void login()
            }}
            RightAccessory={PasswordRightAccessory}
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          accessibilityLabel={translate("loginScreen:saveSessionAccessibility")}
          accessibilityRole="switch"
          accessibilityState={{ checked: shouldSaveSession, disabled: isLoading }}
          disabled={isLoading}
          onPress={() => setShouldSaveSession((current) => !current)}
          style={themed($saveSessionButton)}
          testID="save-session-toggle"
        >
          <View
            style={[
              themed($saveSessionIndicator),
              shouldSaveSession && themed($saveSessionIndicatorActive),
            ]}
          >
            {shouldSaveSession ? (
              <CheckCircleIcon size={18} color={colors.palette.neutral100} />
            ) : (
              <LockClosedIcon size={16} color={colors.palette.primary500} />
            )}
          </View>
          <View style={themed($saveSessionCopy)}>
            <Text
              tx="loginScreen:saveSessionTitle"
              size="xs"
              weight="bold"
              style={themed($saveSessionTitle)}
            />
            <Text tx="loginScreen:saveSessionBody" size="xxs" style={themed($saveSessionBody)} />
          </View>
        </TouchableOpacity>

        <Button
          testID="login-button"
          isLoading={isLoading}
          disabled={hasValidationErrors}
          onPress={() => {
            void login()
          }}
          style={themed($ctaButton)}
        >
          <Text style={themed($ctaText)} tx="loginScreen:secureSignIn" />
        </Button>

        <View style={themed($footerRow)}>
          <Button
            labelTx="loginScreen:forgotPassword"
            variant="ghost"
            onPress={() => {
              // Intentionally left as future integration.
            }}
            style={themed($forgotBtn)}
          />
          <View style={themed($sessionBadge)}>
            <ShieldCheckIcon size={14} color={colors.palette.success500} />
            <Text
              tx={shouldSaveSession ? "loginScreen:savedSession" : "loginScreen:currentSessionOnly"}
              size="xxs"
              weight="bold"
              style={themed($sessionText)}
            />
          </View>
        </View>
      </Animated.View>
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexGrow: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "relative",
  overflow: "hidden",
  paddingHorizontal: 16,
  paddingBottom: 20,
  backgroundColor: colors.header,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(121,168,255,0.14)",
})

const $headerGlowPrimary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: 999,
  backgroundColor: colors.glow,
  top: -110,
  right: -40,
})

const $headerGlowSecondary: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  width: 180,
  height: 180,
  borderRadius: 999,
  backgroundColor: colors.glowStrong,
  bottom: -90,
  left: -70,
})

const $topRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
})

const $backIconWrap: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.10)",
  borderWidth: 1,
  borderColor: "rgba(175,195,224,0.18)",
})

const $headerSpacer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $topHint: ThemedStyle<TextStyle> = () => ({
  color: "rgba(220,233,255,0.72)",
  letterSpacing: 0,
})

const $topButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 36,
  borderRadius: 16,
  paddingHorizontal: 12,
  backgroundColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  borderColor: "rgba(175,195,224,0.18)",
})

const $topButtonText: ThemedStyle<TextStyle> = () => ({
  color: "rgba(248,251,255,0.92)",
  letterSpacing: 0,
})

const $headerCopy: ThemedStyle<ViewStyle> = () => ({
  marginTop: 16,
  gap: 8,
})

const $productPill: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-start",
  minHeight: 32,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  paddingHorizontal: 10,
  backgroundColor: "rgba(37,99,235,0.18)",
  borderWidth: 1,
  borderColor: "rgba(96,165,250,0.26)",
})

const $productPillText: ThemedStyle<TextStyle> = () => ({
  color: "rgba(255,255,255,0.88)",
  letterSpacing: 0,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 28,
  lineHeight: 34,
  letterSpacing: 0,
})

const $headerSubtitle: ThemedStyle<TextStyle> = () => ({
  color: "rgba(220,233,255,0.78)",
  lineHeight: 20,
  letterSpacing: 0,
})

const $assuranceStrip: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
  marginTop: 14,
  borderRadius: 16,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(17,27,47,0.72)",
  borderWidth: 1,
  borderColor: "rgba(175,195,224,0.16)",
})

const $assuranceItem: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingHorizontal: 8,
})

const $assuranceText: ThemedStyle<TextStyle> = () => ({
  color: "rgba(248,251,255,0.86)",
  letterSpacing: 0,
})

const $assuranceDivider: ThemedStyle<ViewStyle> = () => ({
  width: 1,
  height: 28,
  backgroundColor: "rgba(175,195,224,0.18)",
})

const $formSection: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  flex: 1,
  marginTop: 10,
  marginHorizontal: 12,
  paddingHorizontal: 16,
  paddingTop: 18,
  paddingBottom: 20,
  backgroundColor: colors.surfaceRaised,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: isDark ? 0.2 : 0.12,
  shadowRadius: 26,
  elevation: 5,
})

const $formHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
})

const $formIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 38,
  height: 38,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.surfaceInset,
})

const $formHeaderText: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  fontSize: 22,
  lineHeight: 28,
  letterSpacing: 0,
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  lineHeight: 18,
  letterSpacing: 0,
})

const $fields: ThemedStyle<ViewStyle> = () => ({
  gap: 8,
})

const $textField: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 0,
})

const $inputWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 48,
  borderRadius: 16,
  backgroundColor: colors.inputBackground,
  borderColor: colors.inputBorder,
})

const $errorMessage: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginBottom: 12,
  letterSpacing: 0,
})

const $saveSessionButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 58,
  marginTop: 12,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
})

const $saveSessionIndicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 34,
  height: 34,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: colors.inputBorder,
  backgroundColor: colors.surfaceInset,
})

const $saveSessionIndicatorActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.palette.primary400,
  backgroundColor: colors.palette.primary500,
})

const $saveSessionCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  gap: 2,
})

const $saveSessionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textPrimary,
  letterSpacing: 0,
})

const $saveSessionBody: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  letterSpacing: 0,
})

const $ctaButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 48,
  borderRadius: 16,
  marginTop: 14,
  backgroundColor: colors.palette.primary500,
})

const $ctaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 16,
  fontWeight: "700",
  letterSpacing: 0,
})

const $footerRow: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
  marginTop: 8,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
})

const $forgotBtn: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
  borderRadius: 16,
  paddingHorizontal: 0,
})

const $sessionBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 36,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  paddingHorizontal: 10,
  backgroundColor: colors.statusSuccessBackground,
})

const $sessionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.success500,
  letterSpacing: 0,
})
