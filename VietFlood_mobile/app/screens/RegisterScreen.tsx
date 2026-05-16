import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
// eslint-disable-next-line no-restricted-imports
import { TextInput, TextStyle, TouchableOpacity, ViewStyle } from "react-native"
import { View, useWindowDimensions } from "react-native"
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserPlusIcon,
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
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface RegisterScreenProps extends AppStackScreenProps<"Register"> {}

export const RegisterScreen: FC<RegisterScreenProps> = ({ navigation }) => {
  const authPasswordInput = useRef<TextInput>(null)
  const authConfirmPasswordInput = useRef<TextInput>(null)

  const [authEmail, setAuthEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isConfirmPasswordHidden, setIsConfirmPasswordHidden] = useState(true)
  const [emailError, setEmailError] = useState("")
  const [fullNameError, setFullNameError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [emailLiveValidation, setEmailLiveValidation] = useState(false)
  const [fullNameLiveValidation, setFullNameLiveValidation] = useState(false)
  const [passwordLiveValidation, setPasswordLiveValidation] = useState(false)
  const [confirmPasswordLiveValidation, setConfirmPasswordLiveValidation] = useState(false)

  const { showAlert } = useGlobalAlert()
  const { registerUser, authStatus } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()

  const validateEmail = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return translate("registerScreen:validations.emailRequired")
    if (normalized.length < 3) return translate("registerScreen:validations.emailMinLength")
    if (!normalized.includes("@")) return translate("registerScreen:validations.emailAtSign")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return translate("registerScreen:validations.emailInvalid")
    }
    return ""
  }

  const validateFullName = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return translate("registerScreen:validations.fullNameRequired")
    if (normalized.length < 2) return translate("registerScreen:validations.fullNameMinLength")
    if (normalized.length > 100) return translate("registerScreen:validations.fullNameMaxLength")
    return ""
  }

  const validatePassword = (value: string) => {
    if (!value) return translate("registerScreen:validations.passwordRequired")
    if (value.length < 8) return translate("registerScreen:validations.passwordMinLength")
    if (!/[A-Z]/.test(value)) return translate("registerScreen:validations.passwordUppercase")
    if (!/[0-9]/.test(value)) return translate("registerScreen:validations.passwordNumber")
    return ""
  }

  const validateConfirmPassword = (value: string) => {
    if (!value) return translate("registerScreen:validations.confirmPasswordRequired")
    if (value !== authPassword) return translate("registerScreen:validations.confirmPasswordMismatch")
    return ""
  }

  useEffect(() => {
    if (!emailLiveValidation) return
    if (!authEmail || authEmail.trim().length < 3) {
      setEmailError("")
      return
    }

    const timeout = setTimeout(() => {
      setEmailError(validateEmail(authEmail))
    }, 300)

    return () => clearTimeout(timeout)
  }, [authEmail, emailLiveValidation])

  useEffect(() => {
    if (!fullNameLiveValidation) return
    if (!fullName || fullName.trim().length < 2) {
      setFullNameError("")
      return
    }

    const timeout = setTimeout(() => {
      setFullNameError(validateFullName(fullName))
    }, 300)

    return () => clearTimeout(timeout)
  }, [fullName, fullNameLiveValidation])

  useEffect(() => {
    if (!passwordLiveValidation) return
    if (!authPassword || authPassword.length < 3) {
      setPasswordError("")
      return
    }

    const timeout = setTimeout(() => {
      setPasswordError(validatePassword(authPassword))
    }, 300)

    return () => clearTimeout(timeout)
  }, [authPassword, passwordLiveValidation])

  useEffect(() => {
    if (!confirmPasswordLiveValidation) return
    if (!confirmPassword) {
      setConfirmPasswordError("")
      return
    }

    const timeout = setTimeout(() => {
      setConfirmPasswordError(validateConfirmPassword(confirmPassword))
    }, 300)

    return () => clearTimeout(timeout)
  }, [confirmPassword, authPassword, confirmPasswordLiveValidation])

  const hasValidationErrors = Boolean(
    emailError || fullNameError || passwordError || confirmPasswordError,
  )

  const isLoading = authStatus === "pending"

  async function register() {
    setEmailLiveValidation(true)
    setFullNameLiveValidation(true)
    setPasswordLiveValidation(true)
    setConfirmPasswordLiveValidation(true)

    const nextEmailError = validateEmail(authEmail)
    const nextFullNameError = validateFullName(fullName)
    const nextPasswordError = validatePassword(authPassword)
    const nextConfirmPasswordError = validateConfirmPassword(confirmPassword)

    setEmailError(nextEmailError)
    setFullNameError(nextFullNameError)
    setPasswordError(nextPasswordError)
    setConfirmPasswordError(nextConfirmPasswordError)

    if (nextEmailError || nextFullNameError || nextPasswordError || nextConfirmPasswordError) {
      return
    }

    const nameParts = fullName.trim().split(" ")
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]
    const middleName = nameParts.slice(1, -1).join(" ") || ""

    const success = await registerUser({
      email: authEmail,
      username: authEmail.split("@")[0],
      password: authPassword,
      phone: "",
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      date_of_birth: "2000-01-01",
      province: "",
      district: "",
      ward: "",
      address_line: "",
    })

    if (!success) {
      showAlert({
        title: translate("registerScreen:alertErrorTitle"),
        description: translate("registerScreen:alertErrorDescription"),
        variant: "error",
      })
      return
    }

    showAlert({
      title: translate("registerScreen:alertSuccessTitle"),
      description: translate("registerScreen:alertSuccessDescription"),
      variant: "success",
    })

    navigation.navigate("Login")
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

  const ConfirmPasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function ConfirmPasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isConfirmPasswordHidden ? "view" : "hidden"}
            color={colors.text}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsConfirmPasswordHidden(!isConfirmPasswordHidden)}
          />
        )
      },
    [isConfirmPasswordHidden, colors.text],
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
          { paddingTop: insets.top + 16, minHeight: Math.max(184, height * 0.24) },
        ]}
      >
        <View style={themed($headerGlowPrimary)} />
        <View style={themed($headerGlowSecondary)} />

        <Animated.View entering={FadeInDown.duration(500)} style={themed($topRow)}>
          <TouchableOpacity
            accessibilityLabel={translate("registerScreen:backAccessibility")}
            onPress={() => navigation.navigate("Login")}
            style={themed($backIconWrap)}
          >
            <ChevronLeftIcon size={18} color={colors.palette.neutral100} />
          </TouchableOpacity>
          <View style={themed($headerSpacer)} />
          <Text size="xxs" tx="registerScreen:haveAccount" style={themed($topHint)} />
          <Button
            variant="ghost"
            onPress={() => navigation.navigate("Login")}
            style={themed($topButton)}
          >
            <Text
              tx="registerScreen:loginAction"
              size="xxs"
              weight="bold"
              style={themed($topButtonText)}
            />
          </Button>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={themed($headerCopy)}>
          <View style={themed($productPill)}>
            <UserPlusIcon size={14} color={colors.palette.primary300} />
            <Text
              tx="registerScreen:productPill"
              size="xxs"
              weight="bold"
              style={themed($productPillText)}
            />
          </View>
          <Text tx="registerScreen:headerTitle" preset="heading" style={themed($headerTitle)} />
          <Text tx="registerScreen:headerSubtitle" size="sm" style={themed($headerSubtitle)} />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(140)} style={themed($formSection)}>
        <View style={themed($formHeader)}>
          <View style={themed($formIcon)}>
            <UserCircleIcon size={20} color={colors.palette.primary500} />
          </View>
          <View style={themed($formHeaderText)}>
            <Text
              testID="register-heading"
              tx="registerScreen:formTitle"
              preset="heading"
              style={themed($title)}
            />
            <Text tx="registerScreen:formSubtitle" size="sm" style={themed($subtitle)} />
          </View>
        </View>

        <View style={themed($fields)}>
          <TextField
            value={authEmail}
            onChangeText={(value) => {
              setAuthEmail(value)
            }}
            onBlur={() => {
              setEmailLiveValidation(true)
              setEmailError(validateEmail(authEmail))
            }}
            containerStyle={themed($textField)}
            inputWrapperStyle={themed($inputWrapper)}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            labelTx="registerScreen:emailLabel"
            placeholderTx="registerScreen:emailPlaceholder"
            errorMessage={emailError}
            validationState={
              emailError
                ? "error"
                : emailLiveValidation && !emailError && !!authEmail
                  ? "success"
                  : "none"
            }
            onSubmitEditing={() => authPasswordInput.current?.focus()}
            editable={!isLoading}
          />

          <TextField
            value={fullName}
            onChangeText={(value) => {
              setFullName(value)
            }}
            onBlur={() => {
              setFullNameLiveValidation(true)
              setFullNameError(validateFullName(fullName))
            }}
            containerStyle={themed($textField)}
            inputWrapperStyle={themed($inputWrapper)}
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            labelTx="registerScreen:fullNameLabel"
            placeholderTx="registerScreen:fullNamePlaceholder"
            errorMessage={fullNameError}
            validationState={
              fullNameError
                ? "error"
                : fullNameLiveValidation && !fullNameError && !!fullName
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
            labelTx="registerScreen:passwordLabel"
            placeholderTx="registerScreen:passwordPlaceholder"
            errorMessage={passwordError}
            validationState={
              passwordError
                ? "error"
                : passwordLiveValidation && !passwordError && !!authPassword
                  ? "success"
                  : "none"
            }
            RightAccessory={PasswordRightAccessory}
            onSubmitEditing={() => authConfirmPasswordInput.current?.focus()}
            editable={!isLoading}
          />

          <TextField
            ref={authConfirmPasswordInput}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value)
            }}
            onBlur={() => {
              setConfirmPasswordLiveValidation(true)
              setConfirmPasswordError(validateConfirmPassword(confirmPassword))
            }}
            containerStyle={themed($textField)}
            inputWrapperStyle={themed($inputWrapper)}
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            secureTextEntry={isConfirmPasswordHidden}
            labelTx="registerScreen:confirmPasswordLabel"
            placeholderTx="registerScreen:confirmPasswordPlaceholder"
            errorMessage={confirmPasswordError}
            validationState={
              confirmPasswordError
                ? "error"
                : confirmPasswordLiveValidation && !confirmPasswordError && !!confirmPassword
                  ? "success"
                  : "none"
            }
            RightAccessory={ConfirmPasswordRightAccessory}
            onSubmitEditing={() => {
              void register()
            }}
            editable={!isLoading}
          />
        </View>

        <View style={themed($requirements)}>
          <View style={themed($requirementItem)}>
            <LockClosedIcon size={15} color={colors.palette.primary500} />
            <Text
              tx="registerScreen:requirementLength"
              size="xxs"
              weight="bold"
              style={themed($requirementText)}
            />
          </View>
          <View style={themed($requirementItem)}>
            <ShieldCheckIcon size={15} color={colors.palette.success500} />
            <Text
              tx="registerScreen:requirementComplexity"
              size="xxs"
              weight="bold"
              style={themed($requirementText)}
            />
          </View>
          <View style={themed($requirementItem)}>
            <DocumentTextIcon size={15} color={colors.palette.accent500} />
            <Text
              tx="registerScreen:requirementProfile"
              size="xxs"
              weight="bold"
              style={themed($requirementText)}
            />
          </View>
        </View>

        <Button
          testID="register-button"
          isLoading={isLoading}
          disabled={hasValidationErrors || isLoading}
          onPress={() => {
            void register()
          }}
          style={themed($ctaButton)}
        >
          <Text style={themed($ctaText)} tx="registerScreen:submit" />
        </Button>
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

const $formSection: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  flex: 1,
  marginTop: -20,
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

const $requirements: ThemedStyle<ViewStyle> = () => ({
  marginTop: 12,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
})

const $requirementItem: ThemedStyle<ViewStyle> = ({ colors }) => ({
  minHeight: 32,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  paddingHorizontal: 10,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: colors.border,
})

const $requirementText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textSecondary,
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
