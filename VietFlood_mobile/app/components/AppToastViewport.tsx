import { FC } from "react"
import { ToastPosition, Toasts } from "@backpackapp-io/react-native-toast"

export const AppToastViewport: FC = () => {
  return (
    <Toasts
      defaultDuration={2800}
      defaultPosition={ToastPosition.TOP}
      globalAnimationType="spring"
      globalAnimationConfig={{
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        flingPositionReturnDuration: 90,
      }}
      globalLimit={4}
      extraInsets={{ top: 8 }}
    />
  )
}
