import { FC, useState } from "react"
import { View, ViewStyle } from "react-native"
import { Pressable } from "react-native"
import { ArrowLeftIcon } from "react-native-heroicons/outline"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { translate } from "@/i18n/translate"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { appToast } from "@/utils/toast"

interface ChangePasswordScreenProps extends AppStackScreenProps<"ChangePasswordScreen"> {}

/**
 * ChangePasswordScreen - Allows users to change their account password
 */
export const ChangePasswordScreen: FC<ChangePasswordScreenProps> = ({ navigation }) => {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validate = (): string | null => {
    if (!currentPassword.trim()) {
      return translate("changePasswordScreen:validations.currentPasswordRequired")
    }
    if (!newPassword.trim()) return translate("changePasswordScreen:validations.newPasswordRequired")
    if (newPassword.length < 6) {
      return translate("changePasswordScreen:validations.newPasswordMinLength")
    }
    if (!confirmPassword.trim()) {
      return translate("changePasswordScreen:validations.confirmPasswordRequired")
    }
    if (newPassword !== confirmPassword) {
      return translate("changePasswordScreen:validations.confirmPasswordMismatch")
    }
    if (currentPassword === newPassword)
      return translate("changePasswordScreen:validations.newPasswordMustDiffer")
    return null
  }

  const handleChangePassword = async () => {
    const validationError = validate()
    if (validationError) {
      appToast.warning({
        title: translate("changePasswordScreen:toastValidationTitle"),
        description: validationError,
      })
      return
    }

    setLoading(true)
    try {
      // TODO: Call authService.changePassword(currentPassword, newPassword)
      // For now, show success message
      appToast.success({
        title: translate("changePasswordScreen:toastSuccessTitle"),
        description: translate("changePasswordScreen:toastSuccessDescription"),
      })
      navigation.goBack()
    } catch (error) {
      appToast.error({
        title: translate("changePasswordScreen:toastErrorTitle"),
        description: translate("changePasswordScreen:toastErrorDescription"),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={[themed($container), { backgroundColor: colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[themed($header), { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            themed($backButton),
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text tx="changePasswordScreen:title" size="lg" weight="bold" />
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={[themed($content), { paddingTop: 16 }]}>
        <Text
          tx="changePasswordScreen:subtitle"
          size="sm"
          style={{ color: colors.textDim, marginBottom: 16 }}
        />

        {/* Current Password */}
        <View style={themed($fieldContainer)}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              tx="changePasswordScreen:currentPasswordLabel"
              size="sm"
              weight="bold"
              style={{ color: colors.text }}
            />
            <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
              <Text
                tx={showCurrentPassword ? "components:input.hide" : "components:input.show"}
                size="xs"
                style={{ color: colors.statusInfo }}
              />
            </Pressable>
          </View>
          <TextField
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholderTx="changePasswordScreen:currentPasswordPlaceholder"
            secureTextEntry={!showCurrentPassword}
            editable={!loading}
          />
        </View>

        {/* New Password */}
        <View style={themed($fieldContainer)}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              tx="changePasswordScreen:newPasswordLabel"
              size="sm"
              weight="bold"
              style={{ color: colors.text }}
            />
            <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
              <Text
                tx={showNewPassword ? "components:input.hide" : "components:input.show"}
                size="xs"
                style={{ color: colors.statusInfo }}
              />
            </Pressable>
          </View>
          <TextField
            value={newPassword}
            onChangeText={setNewPassword}
            placeholderTx="changePasswordScreen:newPasswordPlaceholder"
            secureTextEntry={!showNewPassword}
            editable={!loading}
          />
          <Text tx="changePasswordScreen:minLengthHint" size="xs" style={{ color: colors.textDim, marginTop: 4 }} />
        </View>

        {/* Confirm Password */}
        <View style={themed($fieldContainer)}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              tx="changePasswordScreen:confirmPasswordLabel"
              size="sm"
              weight="bold"
              style={{ color: colors.text }}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Text
                tx={showConfirmPassword ? "components:input.hide" : "components:input.show"}
                size="xs"
                style={{ color: colors.statusInfo }}
              />
            </Pressable>
          </View>
          <TextField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholderTx="changePasswordScreen:confirmPasswordPlaceholder"
            secureTextEntry={!showConfirmPassword}
            editable={!loading}
          />
        </View>

        {/* Buttons */}
        <View style={themed($buttonContainer)}>
          <Button
            labelTx="changePasswordScreen:submit"
            variant="primary"
            onPress={handleChangePassword}
            disabled={loading}
            isLoading={loading}
          />
          <Button
            labelTx="changePasswordScreen:cancel"
            variant="secondary"
            onPress={() => navigation.goBack()}
            disabled={loading}
          />
        </View>
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  flex: 1,
})

const $fieldContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  gap: spacing.sm,
})
