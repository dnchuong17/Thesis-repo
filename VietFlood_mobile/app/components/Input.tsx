import React, { useState } from "react"
import { View, TouchableOpacity } from "react-native"

import { Input as ReusableInput } from "@/components/ui-reusables/input"
import { Text } from "@/components/ui-reusables/text"
import type { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { cn } from "@/lib/utils"
import { useAppTheme } from "@/theme/context"

interface InputProps {
  label?: string
  labelTx?: TxKeyPath
  error?: string
  errorTx?: TxKeyPath
  icon?: React.ReactNode
  isPassword?: boolean
  value?: string
  placeholder?: string
  placeholderTx?: TxKeyPath
  onChangeText?: (text: string) => void
  editable?: boolean
  accessibilityLabel?: string
  accessibilityLabelTx?: TxKeyPath
  testID?: string
  className?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  labelTx,
  error,
  errorTx,
  icon,
  isPassword,
  value,
  placeholder,
  placeholderTx,
  onChangeText,
  editable = true,
  accessibilityLabel,
  accessibilityLabelTx,
  testID,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [isSecure, setIsSecure] = useState(isPassword)
  const {
    theme: { colors },
  } = useAppTheme()
  const resolvedLabel = labelTx ? translate(labelTx) : label
  const resolvedError = errorTx ? translate(errorTx) : error
  const resolvedPlaceholder = placeholderTx ? translate(placeholderTx) : placeholder
  const resolvedAccessibilityLabel = accessibilityLabelTx
    ? translate(accessibilityLabelTx)
    : accessibilityLabel || resolvedLabel

  return (
    <View className="mb-6 gap-2">
      {resolvedLabel && (
        <Text className="text-sm font-bold text-foreground">{resolvedLabel}</Text>
      )}

      <View
        className={cn(
          "flex-row items-center rounded-lg border border-input bg-background px-3",
          isFocused && "border-primary ring-1 ring-primary",
          resolvedError && "border-destructive ring-1 ring-destructive/20",
          className,
        )}
      >
        {icon && <View className="mr-2">{icon}</View>}

        <ReusableInput
          className={cn(
            "h-11 flex-1 rounded-none border-0 bg-transparent px-0 py-0 shadow-none",
            "text-foreground",
            "focus-visible:border-0 focus-visible:ring-0",
          )}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          editable={editable}
          value={value}
          placeholder={resolvedPlaceholder}
          onChangeText={onChangeText}
          accessibilityLabel={resolvedAccessibilityLabel}
          testID={testID}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            accessibilityRole="button"
            accessibilityLabel={
              isSecure
                ? translate("components:input.showPassword")
                : translate("components:input.hidePassword")
            }
            className="ml-2"
          >
            <Text className="text-xs font-bold text-primary">
              {isSecure ? translate("components:input.show") : translate("components:input.hide")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {resolvedError && <Text className="text-xs font-bold text-destructive">{resolvedError}</Text>}
    </View>
  )
}
