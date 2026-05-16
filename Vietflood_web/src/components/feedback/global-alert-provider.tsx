"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type AlertVariant = "success" | "error" | "info";

type ShowAlertOptions = {
    title?: string;
    description: string;
    variant?: AlertVariant;
    durationMs?: number;
};

type AlertState = {
    id: number;
    title?: string;
    description: string;
    variant: AlertVariant;
};

type GlobalAlertContextValue = {
    showAlert: (options: ShowAlertOptions) => void;
};

const GlobalAlertContext = createContext<GlobalAlertContextValue | null>(null);
const DEFAULT_DURATION_MS = 3200;

function getVariantClasses(variant: AlertVariant): string {
    if (variant === "success") {
        return "border-emerald-200 bg-emerald-50 text-emerald-900";
    }

    if (variant === "error") {
        return "border-red-200 bg-red-50 text-red-900";
    }

    return "border-sky-200 bg-sky-50 text-sky-900";
}

export function GlobalAlertProvider({ children }: { children: React.ReactNode }) {
    const [alert, setAlert] = useState<AlertState | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearDismissTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const dismissAlert = useCallback(() => {
        clearDismissTimer();
        setAlert(null);
    }, [clearDismissTimer]);

    const showAlert = useCallback(
        ({ title, description, variant = "info", durationMs = DEFAULT_DURATION_MS }: ShowAlertOptions) => {
            clearDismissTimer();

            setAlert({
                id: Date.now(),
                title,
                description,
                variant,
            });

            timeoutRef.current = setTimeout(() => {
                setAlert(null);
                timeoutRef.current = null;
            }, durationMs);
        },
        [clearDismissTimer],
    );

    useEffect(() => {
        return () => {
            clearDismissTimer();
        };
    }, [clearDismissTimer]);

    const contextValue = useMemo(() => ({ showAlert }), [showAlert]);

    return (
        <GlobalAlertContext.Provider value={contextValue}>
            {children}

            {alert ? (
                <div
                    className="pointer-events-none fixed right-4 z-60 w-[min(26rem,calc(100%-2rem))]"
                    style={{ top: "max(1rem, env(safe-area-inset-top))" }}
                >
                    <div
                        key={alert.id}
                        role="status"
                        aria-live="polite"
                        className={`pointer-events-auto w-full rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-200 ${getVariantClasses(alert.variant)}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                {alert.title ? <p className="m-0 text-sm font-semibold">{alert.title}</p> : null}
                                <p className="m-0 text-sm">{alert.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={dismissAlert}
                                className="rounded-full p-1 text-current/80 transition hover:bg-black/10 hover:text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                aria-label="Đóng thông báo"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                                    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </GlobalAlertContext.Provider>
    );
}

export function useGlobalAlert(): GlobalAlertContextValue {
    const context = useContext(GlobalAlertContext);

    if (!context) {
        throw new Error("useGlobalAlert phải được dùng bên trong GlobalAlertProvider.");
    }

    return context;
}
