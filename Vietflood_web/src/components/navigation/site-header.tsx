"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

import { clearAuthTokens, getAuthIdentity, type AuthIdentity } from "@/features/auth/lib/auth-storage";
import { useGlobalAlert } from "@/components/feedback/global-alert-provider";
import { siteConfig } from "@/lib/site-config";

function subscribeToStorage(callback: () => void) {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
}

export function SiteHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { showAlert } = useGlobalAlert();
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const identity = useSyncExternalStore<AuthIdentity | null>(
        subscribeToStorage,
        getAuthIdentity,
        () => null,
    );

    const navItems = [
        {
            label: "Trang chủ",
            href: "/trang-chu",
        },
        {
            label: "Tổng quan",
            href: "/tong-quan",
        },
    ];

    function handleAuthAction() {
        if (identity) {
            setIsLogoutConfirmOpen(true);
            return;
        }

        router.push("/dang-nhap");
    }

    async function handleConfirmLogout() {
        try {
            setIsLoggingOut(true);
            clearAuthTokens();
            setIsLogoutConfirmOpen(false);

            showAlert({
                title: "Đã đăng xuất",
                description: "Phiên đăng nhập của bạn đã được kết thúc. Hên gặp lại bạn!",
                variant: "info",
            });

            router.push("/trang-chu");
            router.refresh();
        } finally {
            setIsLoggingOut(false);
        }
    }

    return (
        <>
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
                <div className="mx-4 flex min-h-7 items-center justify-between">
                    <Link
                        href="/trang-chu"
                        className="inline-flex items-center gap-2.5 font-bold"
                        aria-label="Trang chủ VietFlood Insight"
                    >
                        <span className="h-3 w-3 rounded-full bg-linear-to-br from-sky-600 to-teal-600 shadow-[0_0_0_5px_rgba(2,132,199,0.12)]" />
                        <span>{siteConfig.name}</span>
                    </Link>

                    <div className="my-1 mx-3 flex items-center gap-4">
                        {identity ? (
                            <nav className="flex items-center gap-4" aria-label="Điều hướng chính">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`text-[0.95rem] font-semibold transition ${isActive
                                                ? "text-teal-700"
                                                : "text-slate-700 hover:text-teal-700"
                                                }`}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        ) : null}
                        <button
                            type="button"
                            className={"rounded-full text-[0.95rem] font-semibold hover:cursor-pointer"}
                            onClick={handleAuthAction}
                        >
                            {identity ? "Đăng xuất" : "Đăng nhập"}
                        </button>
                    </div>
                </div>
            </header>

            {isLogoutConfirmOpen ? (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/55 px-4"
                    onClick={() => {
                        if (!isLoggingOut) {
                            setIsLogoutConfirmOpen(false);
                        }
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="Xác nhận đăng xuất"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                            Xác nhận hành động
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900">Đăng xuất</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
                        </p>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => setIsLogoutConfirmOpen(false)}
                                disabled={isLoggingOut}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => void handleConfirmLogout()}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? "Đang xử lý..." : "Xác nhận đăng xuất"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </>
    );
}
