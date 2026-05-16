import { FC, useState, useRef } from "react"
import {
  Modal,
  Pressable,
  ViewStyle,
  TextStyle,
  Alert,
  Animated,
  Easing,
  Dimensions,
  View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { UserIcon, PencilIcon, ArrowRightOnRectangleIcon } from "react-native-heroicons/outline"

import { useAuth } from "@/context/AuthContext"
import type { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Avatar } from "./Avatar"
import { Text } from "./Text"

export interface UserMenuProps {
  hashToken: string
  size?: number
}

type Navigation = AppStackScreenProps<any>["navigation"]

interface ButtonPosition {
  x: number
  y: number
  width: number
  height: number
}

/**
 * UserMenu - Avatar button that opens a dropdown menu with:
 * - View Profile
 * - Edit Profile
 * - Logout
 */
export const UserMenu: FC<UserMenuProps> = ({ hashToken, size = 40 }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scaleAnim] = useState(new Animated.Value(0))
  const [opacityAnim] = useState(new Animated.Value(0))
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<View>(null)
  const { logout } = useAuth()
  const { themed } = useAppTheme()
  const navigation = useNavigation<Navigation>()

  const GAP = 8
  const MENU_WIDTH = 240

  const openMenu = () => {
    if (!buttonRef.current) return

    buttonRef.current.measureInWindow((x, y, width, height) => {
      setButtonPosition({ x, y, width, height })

      const screenWidth = Dimensions.get("window").width
      const calculatedRight = screenWidth - (x + width)

      // Calculate top: below the button with gap
      const calculatedTop = y + height + GAP

      setMenuPosition({
        top: calculatedTop,
        right: Math.max(12, calculatedRight), // Ensure minimum padding from edge
      })

      setMenuOpen(true)
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    })
  }

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuOpen(false)
      scaleAnim.setValue(0)
      opacityAnim.setValue(0)
    })
  }

  const handleViewProfile = () => {
    closeMenu()
    setTimeout(() => {
      navigation.navigate("Settings", { screen: "ProfileView" })
    }, 100)
  }

  const handleEditProfile = () => {
    closeMenu()
    setTimeout(() => {
      navigation.navigate("Settings", { screen: "ProfileEdit" })
    }, 100)
  }

  const handleLogout = () => {
    closeMenu()
    Alert.alert(
      translate("components:userMenu.logoutTitle"),
      translate("components:userMenu.logoutDescription"),
      [
        {
          text: translate("components:userMenu.cancel"),
          onPress: () => {},
          style: "cancel",
        },
        {
          text: translate("components:userMenu.confirmLogout"),
          onPress: () => {
            logout()
          },
          style: "destructive",
        },
      ],
      { cancelable: false },
    )
  }

  return (
    <>
      {/* Avatar Button */}
      <View ref={buttonRef}>
        <Pressable
          onPress={openMenu}
          style={({ pressed }) => [themed($avatarButton), pressed && themed($avatarButtonPressed)]}
        >
          <Avatar hashToken={hashToken} size={size} style={themed($avatar)} />
        </Pressable>
      </View>

      {/* Menu Modal */}
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={closeMenu}>
        {/* Backdrop - Full screen touchable area */}
        <Pressable style={themed($backdropFull)} onPress={closeMenu}>
          {/* Menu Container with absolute positioning */}
          <Animated.View
            style={[
              themed($menuContainerAbsolute),
              {
                top: menuPosition.top,
                right: menuPosition.right,
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable onPress={(e) => e.stopPropagation()} style={themed($menuContainerInner)}>
              {/* Menu Items */}
              <MenuItem
                icon={UserIcon}
                labelTx="components:userMenu.viewProfile"
                onPress={handleViewProfile}
                isLast={false}
              />
              <MenuItem
                icon={PencilIcon}
                labelTx="components:userMenu.editProfile"
                onPress={handleEditProfile}
                isLast={false}
              />
              <MenuItem
                icon={ArrowRightOnRectangleIcon}
                labelTx="components:userMenu.logout"
                onPress={handleLogout}
                isDangerous
                isLast={true}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  )
}

interface MenuItemProps {
  icon: React.ComponentType<{ color: string; size: number }>
  label?: string
  labelTx?: TxKeyPath
  onPress: () => void
  isDangerous?: boolean
  isLast?: boolean
}

const MenuItem: FC<MenuItemProps> = ({
  icon: IconComponent,
  label,
  labelTx,
  onPress,
  isDangerous = false,
  isLast = false,
}) => {
  const { themed, theme } = useAppTheme()
  const iconColor = isDangerous ? theme.colors.palette.angry500 : theme.colors.textPrimary

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        pressed
          ? [
              themed(({ isDark }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 18,
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
              })),
              themed($menuItemPressed),
            ]
          : themed(({ isDark }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 18,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderBottomWidth: isLast ? 0 : 1,
              borderBottomColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
            }))
      }
    >
      <IconComponent color={iconColor} size={22} />
      <Text
        tx={labelTx}
        text={label}
        style={isDangerous ? themed($menuItemDangerous) : themed($menuItemText)}
      />
    </Pressable>
  )
}

const $avatarButton: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  borderWidth: 2,
  borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
  borderRadius: 20,
  padding: 0,
  overflow: "hidden",
})

const $avatarButtonPressed: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  opacity: 0.8,
})

const $avatar: ThemedStyle<ViewStyle> = () => ({
  margin: 0,
})

const $backdrop: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  justifyContent: "flex-start",
  alignItems: "flex-end",
  paddingTop: 56,
  paddingRight: 16,
})

const $backdropFull: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
})

const $menuContainer: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  backgroundColor: isDark ? "#1a1a1a" : "#FFFFFF",
  borderRadius: 18,
  overflow: "hidden",
  minWidth: 240,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 10,
  borderWidth: isDark ? 1 : 0,
  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : undefined,
})

const $menuContainerAbsolute: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
})

const $menuContainerInner: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  backgroundColor: isDark ? "#1a1a1a" : "#FFFFFF",
  borderRadius: 18,
  overflow: "hidden",
  minWidth: 240,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 10,
  borderWidth: isDark ? 1 : 0,
  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : undefined,
})

const $menuItem: ThemedStyle<ViewStyle> = ({ isDark }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingHorizontal: 18,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
})

const $menuItemPressed: ThemedStyle<ViewStyle> = ({ colors, isDark }) => ({
  backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.06)",
})

const $menuItemText: ThemedStyle<TextStyle> = ({ colors, isDark }) => ({
  color: isDark ? "#FFFFFF" : "#1a1a1a",
  fontSize: 16,
  fontWeight: "500",
  letterSpacing: 0.2,
})

const $menuItemDangerous: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: "#EF4444",
  fontSize: 16,
  fontWeight: "500",
  letterSpacing: 0.2,
})
