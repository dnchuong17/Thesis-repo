import { toast, ToastPosition, type Toast } from "@backpackapp-io/react-native-toast"

import { SileoToastCard, type SileoToastVariant } from "@/components/SileoToastCard"

export interface AppToastPayload {
  title?: string
  description: string
  variant?: SileoToastVariant
  durationMs?: number
}

const DEFAULT_DURATION_MS = 2800

function buildAccessibilityMessage(payload: AppToastPayload) {
  return [payload.title, payload.description].filter(Boolean).join(". ")
}

function buildOptions(payload: Required<Pick<AppToastPayload, "description">> & AppToastPayload) {
  const variant = payload.variant ?? "info"

  return {
    accessabilityMessage: buildAccessibilityMessage(payload),
    animationType: "spring" as const,
    animationConfig: {
      damping: 18,
      stiffness: 180,
      mass: 0.9,
      flingPositionReturnDuration: 90,
    },
    duration: payload.durationMs ?? DEFAULT_DURATION_MS,
    position: ToastPosition.TOP,
    isSwipeable: true,
    customToast: (toastInstance: Toast) => (
      <SileoToastCard
        toast={toastInstance}
        title={payload.title}
        description={payload.description}
        variant={variant}
      />
    ),
  }
}

function show(payload: AppToastPayload) {
  const variant = payload.variant ?? "info"
  const options = buildOptions({ ...payload, variant })
  const message = buildAccessibilityMessage(payload)

  if (variant === "success") return toast.success(message, options)
  if (variant === "error") return toast.error(message, options)

  return toast(message, options)
}

export const appToast = {
  show,
  success: (payload: Omit<AppToastPayload, "variant">) => show({ ...payload, variant: "success" }),
  error: (payload: Omit<AppToastPayload, "variant">) => show({ ...payload, variant: "error" }),
  info: (payload: Omit<AppToastPayload, "variant">) => show({ ...payload, variant: "info" }),
  warning: (payload: Omit<AppToastPayload, "variant">) => show({ ...payload, variant: "warning" }),
  dismiss: (toastId?: string) => toast.dismiss(toastId),
}

export type { SileoToastVariant }
