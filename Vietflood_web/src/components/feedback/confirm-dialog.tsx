"use client";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
    isOpen: boolean;
    title: string;
    description: ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isConfirming?: boolean;
    danger?: boolean;
};

export function ConfirmDialog({
    isOpen,
    title,
    description,
    onConfirm,
    onCancel,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
    isConfirming = false,
    danger = false,
}: ConfirmDialogProps) {
    if (!isOpen) {
        return null;
    }

    const confirmButtonClass = danger
        ? "rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        : "rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60";

    const accentTextClass = danger ? "text-rose-700" : "text-teal-700";
    const borderClass = danger ? "border-rose-200" : "border-teal-200";

    return (
        <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/55 px-4"
            onClick={() => {
                if (!isConfirming) {
                    onCancel();
                }
            }}
        >
            <div
                className={`w-full max-w-md rounded-2xl border bg-white p-5 shadow-2xl ${borderClass}`}
                role="alertdialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${accentTextClass}`}>
                    Xác nhận hành động
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
                <div className="mt-2 text-sm text-slate-600">{description}</div>

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={onCancel}
                        disabled={isConfirming}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={confirmButtonClass}
                        onClick={onConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? "Đang xử lý..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
