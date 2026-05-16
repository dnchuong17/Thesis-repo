import { useEffect, useRef, useState } from "react";

import { type MapOverlay, useHomeDisplayState } from "../state/home-display-state";

function WeatherPanelIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path
                d="M4 4.5H20"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4 10.5H20"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4 16.5H20"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7 7.5H10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M13 13.5H17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9 19.5H15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function OverlaySwitchIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path
                d="M12 3L4 7L12 11L20 7L12 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M8 13.5L4 15.5L12 19.5L20 15.5L16 13.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M17.5 9.5H21V13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M21 9.5C20.5 8.2 19.3 7 17.8 6.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

const OVERLAY_LABELS: Record<string, string> = {
    rain: "Mưa",
    wind: "Gió",
    temp: "Nhiệt độ",
    rh: "Độ ẩm",
    clouds: "Mây",
    pressure: "Áp suất",
};

const OVERLAY_OPTIONS: MapOverlay[] = ["rain", "wind", "temp", "rh", "clouds", "pressure"];

function OverlayOptionIcon({ overlay }: { overlay: MapOverlay }) {
    if (overlay === "rain") {
        return (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 2.25C8 2.25 4.5 6 4.5 8.1C4.5 10.03 6.07 11.6 8 11.6C9.93 11.6 11.5 10.03 11.5 8.1C11.5 6 8 2.25 8 2.25Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
        );
    }

    if (overlay === "wind") {
        return (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M2 5.5H10.5C11.33 5.5 12 4.83 12 4C12 3.17 11.33 2.5 10.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M2 8.5H12.5C13.33 8.5 14 9.17 14 10C14 10.83 13.33 11.5 12.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
        );
    }

    if (overlay === "temp") {
        return (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 2.5V8.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M10 9.75C10 10.85 9.1 11.75 8 11.75C6.9 11.75 6 10.85 6 9.75C6 8.99 6.42 8.32 7.05 7.98V3.9C7.05 3.38 7.48 2.95 8 2.95C8.52 2.95 8.95 3.38 8.95 3.9V7.98C9.58 8.32 10 8.99 10 9.75Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
        );
    }

    if (overlay === "rh") {
        return (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 2.4C8 2.4 4.8 5.8 4.8 7.7C4.8 9.47 6.23 10.9 8 10.9C9.77 10.9 11.2 9.47 11.2 7.7C11.2 5.8 8 2.4 8 2.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M6.7 7.9C6.7 8.62 7.28 9.2 8 9.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
        );
    }

    if (overlay === "clouds") {
        return (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M4.75 10.8H11.3C12.35 10.8 13.2 9.95 13.2 8.9C13.2 7.98 12.54 7.21 11.67 7.04C11.49 5.61 10.28 4.5 8.8 4.5C7.66 4.5 6.66 5.16 6.18 6.12C5.9 6.01 5.6 5.95 5.28 5.95C3.93 5.95 2.85 7.04 2.85 8.39C2.85 9.74 3.93 10.8 4.75 10.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M8 2.2V3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M8 12.2V13.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M2.2 8H3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M12.2 8H13.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    );
}

export function Tools() {
    const { state, dispatch } = useHomeDisplayState();
    const [isOverlayMenuOpen, setIsOverlayMenuOpen] = useState(false);
    const overlayToolRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleDocumentClick(event: MouseEvent) {
            if (!overlayToolRef.current) {
                return;
            }

            if (!overlayToolRef.current.contains(event.target as Node)) {
                setIsOverlayMenuOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOverlayMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleDocumentClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleDocumentClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const weatherStatsToolLabel = state.isWeatherStatsVisible
        ? "Ẩn bảng số liệu thời tiết"
        : "Hiển thị bảng số liệu thời tiết";

    const overlayLabel = OVERLAY_LABELS[state.overlay] ?? state.overlay;
    const overlayToolLabel = `Chọn lớp overlay. Lớp hiện tại: ${overlayLabel}`;

    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
            <div className="mx-4 mt-10 flex flex-col items-start gap-2 z-20">
                <button
                    type="button"
                    onClick={() => dispatch({ type: "toggleWeatherStatsVisibility" })}
                    className={`pointer-events-auto z-20 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition ${state.isWeatherStatsVisible
                        ? "border-cyan-300 bg-cyan-100/95 text-cyan-900 hover:bg-cyan-200/95"
                        : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-white"
                        }`}
                    aria-label={weatherStatsToolLabel}
                    aria-pressed={state.isWeatherStatsVisible}
                    title={weatherStatsToolLabel}
                >
                    <WeatherPanelIcon />
                </button>

                <div ref={overlayToolRef} className="relative pointer-events-auto z-20">
                    <button
                        type="button"
                        onClick={() => setIsOverlayMenuOpen((prev) => !prev)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition ${isOverlayMenuOpen
                            ? "border-emerald-300 bg-emerald-100/95 text-emerald-900 hover:bg-emerald-200/95"
                            : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-white"
                            }`}
                        aria-label={overlayToolLabel}
                        aria-expanded={isOverlayMenuOpen}
                        aria-haspopup="menu"
                        title={overlayToolLabel}
                    >
                        <OverlaySwitchIcon />
                    </button>

                    {isOverlayMenuOpen ? (
                        <div
                            className="absolute left-full top-0 ml-2 min-w-40 rounded-xl border border-slate-200/90 bg-white/96 p-1.5 shadow-lg backdrop-blur"
                            role="menu"
                            aria-label="Chọn overlay bản đồ"
                        >
                            {OVERLAY_OPTIONS.map((option) => {
                                const isActive = state.overlay === option;

                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        role="menuitemradio"
                                        aria-checked={isActive}
                                        onClick={() => {
                                            dispatch({ type: "setOverlay", payload: option });
                                            setIsOverlayMenuOpen(false);
                                        }}
                                        className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition last:mb-0 ${isActive
                                            ? "bg-emerald-100 text-emerald-900"
                                            : "text-slate-700 hover:bg-slate-100"
                                            }`}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <OverlayOptionIcon overlay={option} />
                                            <span>{OVERLAY_LABELS[option]}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
