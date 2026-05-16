import { createContext, FC, PropsWithChildren, useCallback, useContext, useMemo, useRef } from "react"

import { appToast } from "@/utils/toast"

export type AlertVariant = "success" | "error" | "info"

export interface AlertPayload {
  title?: string
  description: string
  variant: AlertVariant
  durationMs?: number
}

interface GlobalAlertContextValue {
  currentAlert?: AlertPayload
  showAlert: (payload: AlertPayload) => void
  hideAlert: () => void
}

const GlobalAlertContext = createContext<GlobalAlertContextValue | null>(null)

export const GlobalAlertProvider: FC<PropsWithChildren> = ({ children }) => {
  const lastToastIdRef = useRef<string | undefined>(undefined)

  const hideAlert = useCallback(() => {
    if (!lastToastIdRef.current) return
    appToast.dismiss(lastToastIdRef.current)
    lastToastIdRef.current = undefined
  }, [])

  const showAlert = useCallback((payload: AlertPayload) => {
    lastToastIdRef.current = appToast.show({
      title: payload.title,
      description: payload.description,
      durationMs: payload.durationMs,
      variant: payload.variant,
    })
  }, [])

  const value = useMemo(
    () => ({
      currentAlert: undefined,
      showAlert,
      hideAlert,
    }),
    [hideAlert, showAlert],
  )

  return <GlobalAlertContext.Provider value={value}>{children}</GlobalAlertContext.Provider>
}

export function useGlobalAlert(): GlobalAlertContextValue {
  const context = useContext(GlobalAlertContext)

  if (!context) {
    throw new Error("useGlobalAlert must be used within a GlobalAlertProvider")
  }

  return context
}
