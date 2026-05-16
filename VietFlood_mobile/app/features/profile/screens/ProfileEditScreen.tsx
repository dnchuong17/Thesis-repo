/**
 * Profile Edit Screen
 *
 * Allows users to edit their profile information:
 * - Phone number
 * - Province (location)
 *
 * Features:
 * - Pre-fills form with current user data
 * - Form validation for required fields
 * - Submit button that calls updateProfile
 * - Success feedback with navigation back
 * - Error display for failed updates
 * - Loading states during submission
 */

import { useEffect, useMemo, FC, useState } from "react"
import {
  View,
  ViewStyle,
  Pressable,
  ActivityIndicator,
  TextInput as RNTextInput,
  Image,
  ImageStyle,
} from "react-native"
import { CheckIcon, XMarkIcon, ArrowLeftIcon, PhotoIcon } from "react-native-heroicons/outline"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { translate } from "@/i18n/translate"
import { useProfile } from "@/hooks/useProfile"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { UpdateUserProfileRequest } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ProfileEditScreenProps extends AppStackScreenProps<"ProfileEdit"> {}

interface FormErrors {
  phone?: string
  province?: string
}

export const ProfileEditScreen: FC<ProfileEditScreenProps> = ({ navigation }) => {
  const { user, loading, updating, updateError, fetchProfile, updateProfile } = useProfile()
  const {
    themed,
    theme: { colors, isDark },
  } = useAppTheme()

  // Form state
  const [phone, setPhone] = useState("")
  const [province, setProvince] = useState("")
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [showSuccess, setShowSuccess] = useState(false)

  // Initialize form with user data
  useEffect(() => {
    if (!user && !loading) {
      fetchProfile()
    }
  }, [user, loading, fetchProfile])

  // Pre-fill form with current user data
  useEffect(() => {
    if (user) {
      setPhone(user.phone || "")
      setProvince(user.province || "")
      setFormErrors({})
      setShowSuccess(false)
    }
  }, [user])

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!phone.trim()) {
      errors.phone = translate("profileEditScreen:validations.phoneRequired")
    } else if (!/^[\d\s+\-()]{10,}$/.test(phone.replace(/\s/g, ""))) {
      errors.phone = translate("profileEditScreen:validations.phoneInvalid")
    }

    if (!province.trim()) {
      errors.province = translate("profileEditScreen:validations.provinceRequired")
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    const updates: UpdateUserProfileRequest = {
      phone: phone.trim(),
      province: province.trim(),
    }

    const success = await updateProfile(updates)

    if (success) {
      setShowSuccess(true)
      // Navigate back after a brief delay to show success message
      setTimeout(() => {
        navigation.goBack()
      }, 1500)
    }
  }

  // Check if form has changes
  const hasChanges = useMemo(() => {
    if (!user) return false
    return phone !== (user.phone || "") || province !== (user.province || "")
  }, [user, phone, province])

  const avatarUrl = user
    ? `https://facehash.dev/api/avatar?name=${encodeURIComponent(user.username)}&size=160`
    : ""

  const bgColor = isDark ? colors.palette.neutral900 : colors.palette.neutral100
  const cardBgColor = isDark ? colors.palette.neutral800 : colors.palette.neutral100
  const inputBgColor = isDark ? colors.palette.neutral700 : colors.palette.neutral200
  const shadowStyle = isDark ? {} : $cardShadow // Apply subtle shadow only in light mode

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={[themed($container), { backgroundColor: bgColor }]}
    >
      {/* Back Button Header */}
      <View style={themed($headerBar)}>
        <Pressable
          style={({ pressed }) => [
            $backButton,
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text tx="profileEditScreen:title" size="lg" weight="bold" />
        <View style={{ width: 44 }} />
      </View>

      {/* Header */}
      <View style={$header}>
        <Text tx="profileEditScreen:subtitle" size="xs" style={{ color: colors.textDim, marginTop: 4 }} />
      </View>

      {/* Success Message */}
      {showSuccess && (
        <View
          style={[
            $successBanner,
            {
              backgroundColor: colors.palette.success500,
            },
          ]}
        >
          <CheckIcon size={20} color="#fff" strokeWidth={2} />
          <Text
            tx="profileEditScreen:successBanner"
            size="sm"
            weight="bold"
            style={{ color: "#fff", marginLeft: 8 }}
          />
        </View>
      )}

      {/* Error Message */}
      {updateError && !showSuccess && (
        <View
          style={[
            $errorBanner,
            {
              backgroundColor: colors.palette.angry500,
            },
          ]}
        >
          <XMarkIcon size={20} color="#fff" strokeWidth={2} />
          <Text
            text={updateError}
            size="sm"
            weight="bold"
            style={{ color: "#fff", marginLeft: 8 }}
          />
        </View>
      )}

      {/* Loading Initial Data */}
      {loading && !user && (
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text tx="profileEditScreen:loading" style={{ marginTop: 12 }} />
        </View>
      )}

      {/* Form */}
      {user && !loading && (
        <>
          <View style={$avatarSection}>
            <View style={$avatarContainer}>
              <Image source={{ uri: avatarUrl }} style={$avatar} />
              <View style={[$avatarEditBadge, { backgroundColor: colors.tint }]}>
                <PhotoIcon size={14} color="#FFF" strokeWidth={2.5} />
              </View>
            </View>
            <Text text={user.username} size="lg" weight="bold" style={{ marginTop: 12 }} />
            <Text text={user.email} size="sm" style={{ color: colors.textDim }} />
          </View>

          <View style={[themed($card), { backgroundColor: cardBgColor }, shadowStyle]}>
            {/* Phone Field */}
            <View style={themed($section)}>
              <Text tx="profileEditScreen:phoneNumber" size="sm" weight="bold" style={$fieldLabel} />
              <View
                style={[
                  themed($inputContainer),
                  {
                    backgroundColor: inputBgColor,
                    borderColor: formErrors.phone ? colors.palette.angry500 : "transparent",
                    borderWidth: formErrors.phone ? 1 : 0,
                  },
                ]}
              >
                <RNTextInput
                  style={[themed($input), { color: colors.text }]}
                  placeholder={translate("profileEditScreen:phonePlaceholder")}
                  placeholderTextColor={colors.textDim}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!updating}
                />
              </View>
              {formErrors.phone && <Text text={formErrors.phone} size="xs" style={$errorText} />}
            </View>

            {/* Province Field */}
            <View style={themed($section)}>
              <Text tx="profileEditScreen:province" size="sm" weight="bold" style={$fieldLabel} />
              <View
                style={[
                  themed($inputContainer),
                  {
                    backgroundColor: inputBgColor,
                    borderColor: formErrors.province ? colors.palette.angry500 : "transparent",
                    borderWidth: formErrors.province ? 1 : 0,
                  },
                ]}
              >
                <RNTextInput
                  style={[themed($input), { color: colors.text }]}
                  placeholder={translate("profileEditScreen:provincePlaceholder")}
                  placeholderTextColor={colors.textDim}
                  value={province}
                  onChangeText={setProvince}
                  editable={!updating}
                />
              </View>
              {formErrors.province && (
                <Text text={formErrors.province} size="xs" style={$errorText} />
              )}
            </View>
          </View>

          {/* Read-only Fields - for reference */}
          <View style={themed($readOnlyCard)}>
            <View style={$readOnlyHeader}>
              <Text tx="profileEditScreen:accountStatus" size="sm" weight="bold" />
              <View style={[$readOnlyBadge, { backgroundColor: colors.palette.neutral300 }]}>
                <Text tx="profileEditScreen:readOnly" size="xxs" style={{ color: colors.palette.neutral700 }} />
              </View>
            </View>

            <View style={$readOnlyRow}>
              <Text tx="profileEditScreen:dateOfBirth" size="sm" style={{ color: colors.textDim }} />
              <Text
                text={
                  user.date_of_birth
                    ? new Date(user.date_of_birth).toLocaleDateString("vi-VN")
                    : translate("profileViewScreen:notProvided")
                }
                size="sm"
              />
            </View>
            <View style={[$divider, { backgroundColor: colors.border }]} />
            <View style={$readOnlyRow}>
              <Text tx="profileEditScreen:role" size="sm" style={{ color: colors.textDim }} />
              <Text
                text={user.role.toUpperCase()}
                size="sm"
                weight="bold"
                style={{ color: colors.tint }}
              />
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* Action Buttons */}
          <View style={$buttonGroup}>
            {/* Cancel Button */}
            <Pressable
              style={({ pressed }) => [
                themed($button),
                {
                  backgroundColor: colors.separator,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => navigation.goBack()}
              disabled={updating}
            >
              <Text tx="profileEditScreen:cancel" size="sm" weight="bold" style={{ color: colors.text }} />
            </Pressable>

            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [
                themed($button),
                {
                  backgroundColor: colors.tint,
                  opacity:
                    pressed || !hasChanges || updating
                      ? pressed
                        ? 0.8
                        : !hasChanges
                          ? 0.5
                          : 0.8
                      : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={!hasChanges || updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text tx="profileEditScreen:saveChanges" size="sm" weight="bold" style={{ color: "#fff" }} />
              )}
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  )
}

// Styles
const $container: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
  paddingHorizontal: 12,
  paddingTop: 8,
  paddingBottom: 20,
})

const $card: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 14,
  padding: 16,
  marginBottom: 16,
})

const $cardShadow: ViewStyle = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
}

const $avatarSection: ViewStyle = {
  alignItems: "center",
  marginBottom: 16,
  marginTop: 4,
}

const $avatarContainer: ViewStyle = {
  position: "relative",
}

const $avatar: ImageStyle = {
  width: 72,
  height: 72,
  borderRadius: 36,
}

const $avatarEditBadge: ViewStyle = {
  position: "absolute",
  bottom: 0,
  right: 0,
  width: 26,
  height: 26,
  borderRadius: 13,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 3,
  borderColor: "#FFF",
}

const $divider: ViewStyle = {
  height: 1,
  marginVertical: 8,
}

const $readOnlyCard: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 20,
  paddingHorizontal: 8,
})

const $readOnlyHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
}

const $readOnlyBadge: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
}

const $readOnlyRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 4,
}

const $headerBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 4,
  paddingVertical: 8,
  marginBottom: 12,
})

const $backButton: ViewStyle = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
}

const $header: ViewStyle = {
  display: "none", // Hide since we use avatar section now
}

const $successBanner: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 14,
  padding: 12,
  marginBottom: 12,
}

const $errorBanner: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 14,
  padding: 12,
  marginBottom: 12,
}

const $section: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 16,
})

const $fieldLabel: ViewStyle = {
  marginBottom: 8,
  marginLeft: 4,
}

const $inputContainer: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 14,
  borderWidth: 1,
  paddingHorizontal: 16,
  paddingVertical: 0,
  height: 48,
  justifyContent: "center",
})

const $input: ThemedStyle<any> = () => ({
  fontSize: 16,
  padding: 0,
  height: 48,
})

const $errorText: ViewStyle = {
  color: "#E53935",
  marginTop: 6,
} as any

const $readOnlyField: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 12,
  padding: 16,
})

const $buttonGroup: ViewStyle = {
  flexDirection: "row",
  gap: 8,
  marginBottom: 20,
}

const $button: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  borderRadius: 12,
  height: 48,
  justifyContent: "center",
  alignItems: "center",
})

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginVertical: 48,
}
