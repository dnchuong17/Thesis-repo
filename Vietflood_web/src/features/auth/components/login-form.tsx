"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useGlobalAlert } from "@/components/feedback/global-alert-provider";
import { signIn } from "@/features/auth/api/sign-in";
import { persistAuthTokens } from "@/features/auth/lib/auth-storage";

function EyeIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-[1.15rem] w-[1.15rem]">
            <path
                d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-[1.15rem] w-[1.15rem]">
            <path
                d="M3 3l18 18M10.6 6.5a9.8 9.8 0 0 1 1.4-.1c6.2 0 10 5.6 10 5.6a18 18 0 0 1-4.2 4.4M6.2 8.1A18.9 18.9 0 0 0 2 12s3.8 6 10 6c.5 0 1 0 1.4-.1"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
            />
            <path
                d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
            />
        </svg>
    );
}

export function LoginForm() {
    const router = useRouter();
    const { showAlert } = useGlobalAlert();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function toDisplayErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            const normalized = error.message.trim().toLowerCase();

            if (normalized === "failed to fetch") {
                return "Không thể kết nối đến server";
            }

            return error.message;
        }

        return "Đăng nhập thất bại. Vui lòng thử lại.";
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!username.trim() || !password.trim()) {
            showAlert({
                title: "Thiếu thông tin",
                description: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
                variant: "error",
            });
            return;
        }

        try {
            setIsSubmitting(true);

            const tokens = await signIn({
                username: username.trim(),
                password,
            });

            persistAuthTokens(tokens);
            showAlert({
                title: "Đăng nhập thành công",
                description: "Chào mừng bạn quay lại hệ thống.",
                variant: "success",
            });
            router.replace("/trang-chu");
            router.refresh();
        } catch (error) {
            const message = toDisplayErrorMessage(error);

            showAlert({
                title: "Đăng nhập thất bại",
                description: message,
                variant: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <label htmlFor="username" className="text-[0.95rem] font-semibold">
                Tên đăng nhập
            </label>
            <input
                id="username"
                name="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                required
            />

            <label htmlFor="password" className="text-[0.95rem] font-semibold">
                Mật khẩu
            </label>
            <div className="relative">
                <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 pr-12 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                    required
                />
                <button
                    type="button"
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-sky-700 transition hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-teal-500/50"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-pressed={showPassword}
                >
                    <span className="sr-only">{showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</span>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>

            <button
                type="submit"
                className="mt-1 rounded-xl bg-linear-to-r from-sky-600 to-teal-600 px-4 py-2.5 font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75"
                disabled={isSubmitting}
            >
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
        </form>
    );
}
