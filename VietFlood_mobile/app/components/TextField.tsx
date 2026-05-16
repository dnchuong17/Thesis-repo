import { forwardRef, Ref, useImperativeHandle, useRef, ComponentType } from "react"
import {
  ImageStyle,
  StyleProp,
  TextInput as RNTextInput,
  TextInputProps,
  Text as RNText,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import Animated, { ZoomIn } from "react-native-reanimated"

import { Icon } from "@/components/Icon"
import type { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

export interface TextFieldAccessoryProps {
  style: StyleProp<ViewStyle | TextStyle | ImageStyle>
  status: TextFieldProps["status"]
  multiline: boolean
  editable: boolean
}

export interface TextFieldProps extends Omit<TextInputProps, "ref"> {
  status?: "error" | "disabled"
  /**
   * Validation state: none | error | success | warning
   */
  validationState?: "none" | "error" | "success" | "warning"
  /**
   * Error message to display below the field
   */
  errorMessage?: string
  /**
   * Success message to display below the field
   */
  successMessage?: string
  label?: string
  labelTx?: TxKeyPath
  helper?: string
  helperTx?: TxKeyPath
  placeholder?: string
  placeholderTx?: TxKeyPath
  style?: StyleProp<TextStyle>
  containerStyle?: StyleProp<ViewStyle>
  inputWrapperStyle?: StyleProp<ViewStyle>
  RightAccessory?: ComponentType<TextFieldAccessoryProps>
  LeftAccessory?: ComponentType<TextFieldAccessoryProps>
}

/**
 * A component that wraps the React Native Reusables Input.
 * Provides backward compatibility with custom TextField API.
 */
export const TextField = forwardRef(
  (
    {
      label,
      labelTx,
      helper,
      helperTx,
      status,
      validationState = "none",
      errorMessage,
      successMessage,
      placeholder,
      placeholderTx,
      RightAccessory,
      LeftAccessory,
      style,
      containerStyle,
      inputWrapperStyle,
      editable = true,
      multiline = false,
      ...props
    }: TextFieldProps,
    ref: Ref<RNTextInput>,
  ) => {
    const inputRef = useRef<RNTextInput>(null)
    const {
      theme: { colors },
    } = useAppTheme()

    useImperativeHandle(ref, () => inputRef.current!)

    const isDisabled = status === "disabled" || !editable
    const isError = status === "error" || validationState === "error"
    const isSuccess = validationState === "success"
    const isWarning = validationState === "warning"
    const resolvedLabel = labelTx ? translate(labelTx) : label
    const resolvedHelper = helperTx ? translate(helperTx) : helper
    const resolvedPlaceholder = placeholderTx ? translate(placeholderTx) : placeholder

    const accessoryProps: TextFieldAccessoryProps = {
      status,
      multiline,
      editable: !isDisabled,
      style: {},
    }

    const wrapperStyle: ViewStyle = {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      opacity: isDisabled ? 0.5 : 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDisabled ? 0 : 0.06,
      shadowRadius: 16,
      elevation: isDisabled ? 0 : 2,
    }

    if (isError) {
      wrapperStyle.borderColor = colors.error
    }

    if (isSuccess) {
      wrapperStyle.borderColor = colors.success
    }

    if (isWarning) {
      wrapperStyle.borderColor = colors.warning
    }

    return (
      <View style={[{ gap: 8 } as ViewStyle, containerStyle]}>
        {resolvedLabel && (
          <RNText style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700" }}>
            {resolvedLabel}
          </RNText>
        )}

        <View style={[wrapperStyle, inputWrapperStyle]}>
          {LeftAccessory && <LeftAccessory {...accessoryProps} />}

          <RNTextInput
            ref={inputRef}
            editable={!isDisabled}
            multiline={multiline}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={props.accessibilityLabel || resolvedLabel || resolvedPlaceholder}
            style={[
              {
                flex: 1,
                minHeight: multiline ? 112 : 44,
                color: colors.textPrimary,
                backgroundColor: "transparent",
                borderWidth: 0,
                paddingHorizontal: 0,
                paddingVertical: 0,
                fontSize: 16,
              },
              style,
            ]}
            {...props}
          />

          {isError && (
            <Animated.View entering={ZoomIn}>
              <Icon
                icon="x"
                size={16}
                color={colors.error}
                accessibilityLabel={translate("components:textField.validationError")}
                containerStyle={{ marginLeft: 8 }}
              />
            </Animated.View>
          )}
          {isSuccess && (
            <Animated.View entering={ZoomIn.springify()}>
              <Icon
                icon="check"
                size={16}
                color={colors.success}
                accessibilityLabel={translate("components:textField.validationSuccess")}
                containerStyle={{ marginLeft: 8 }}
              />
            </Animated.View>
          )}
          {RightAccessory && <RightAccessory {...accessoryProps} />}
        </View>

        {isError && errorMessage && (
          <RNText style={{ color: colors.error, fontSize: 12 }}>{errorMessage}</RNText>
        )}
        {isSuccess && successMessage && (
          <RNText style={{ color: colors.success, fontSize: 12 }}>{successMessage}</RNText>
        )}
        {resolvedHelper && !isError && !isSuccess && (
          <RNText style={{ color: colors.textSecondary, fontSize: 12 }}>{resolvedHelper}</RNText>
        )}
      </View>
    )
  },
)

TextField.displayName = "TextField"
