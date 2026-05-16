"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { apiRequest } from "@/features/auth/lib/api-client";

const DEFAULT_API_BASE_URL = "https://vietflood-app.azurewebsites.net";
const API_BASE_URL =
    process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? DEFAULT_API_BASE_URL;

type ReportStatus = "pending" | "verified" | "resolved" | "rejected";

type ReportEvidence = {
    url?: string;
};

type ReportUser = {
    id?: number;
    username?: string;
    name?: string;
    phone?: string;
};

type Report = {
    id?: number;
    userId?: number;
    user?: ReportUser | null;
    createdBy?: string;
    category?: string[] | string | null;
    description?: string;
    province?: string;
    ward?: string;
    addressLine?: string;
    lat?: number;
    lng?: number;
    status?: ReportStatus | string;
    isUrgent?: boolean;
    severity?: number;
    createdAt?: string;
    evidences?: ReportEvidence[];
    images?: string[];
};

const REPORT_STATUS_OPTIONS: Array<{ value: ReportStatus; label: string }> = [
    { value: "pending", label: "Đang chờ" },
    { value: "verified", label: "Đã xác minh" },
    { value: "resolved", label: "Đã xử lý" },
    { value: "rejected", label: "Đã từ chối" },
];

function formatDate(value?: string): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatReporterPhone(phone?: string): string {
    if (typeof phone !== "string" || phone.trim().length === 0) {
        return "Chưa cập nhật";
    }
    return phone.trim();
}

function formatCategory(category?: string[] | string | null): string {
    const categoryMap: Record<string, string> = {
        flood: "Ngập lụt",
        incident: "Sự cố",
        infrastructure: "Hạ tầng",
        rescue: "Cứu hộ",
    };

    const normalizedCategory = Array.isArray(category)
        ? category
        : typeof category === "string"
            ? [category]
            : [];

    const result = normalizedCategory
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter((item) => item && item !== "undefined" && item !== "null")
        .map((item) => categoryMap[item] ?? item)
        .join(" • ");

    return result || "Chưa phân loại";
}
function formatStatus(status?: string): string {
    const normalized = status?.trim().toLowerCase();

    if (normalized === "pending") {
        return "Đang chờ";
    }
    if (normalized === "verified") {
        return "Đã xác minh";
    }
    if (normalized === "resolved") {
        return "Đã xử lý";
    }
    if (normalized === "rejected") {
        return "Đã từ chối";
    }

    return status?.trim() || "Không rõ";
}

function getStatusBadgeClass(status?: string): string {
    const normalized = status?.trim().toLowerCase();

    if (normalized === "verified") {
        return "border border-sky-200 bg-sky-50 text-sky-700";
    }
    if (normalized === "resolved") {
        return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (normalized === "rejected") {
        return "border border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border border-amber-200 bg-amber-50 text-amber-700";
}

function extractErrorMessage(data: unknown, fallback: string): string {
    if (typeof data === "object" && data !== null && "message" in data) {
        const message = (data as { message?: unknown }).message;

        if (typeof message === "string" && message.trim().length > 0) {
            return message;
        }
    }

    if (typeof data === "object" && data !== null && "error" in data) {
        const error = (data as { error?: unknown }).error;

        if (typeof error === "string" && error.trim().length > 0) {
            return error;
        }
    }

    return fallback;
}

function getThumbnail(report: Report): string | null {
    const evidenceImage = report.evidences?.find((item) => typeof item.url === "string" && item.url.trim().length > 0)?.url;
    if (evidenceImage) {
        return evidenceImage;
    }

    const image = report.images?.find((item) => typeof item === "string" && item.trim().length > 0);
    return image ?? null;
}

function getReporterName(report: Report): string {
    const user = report.user;

    if (user && typeof user.name === "string" && user.name.trim().length > 0) {
        return user.name.trim();
    }

    if (user && typeof user.username === "string" && user.username.trim().length > 0) {
        return user.username.trim();
    }

    if (typeof report.createdBy === "string" && report.createdBy.trim().length > 0) {
        return report.createdBy.trim();
    }

    return `User #${report.userId ?? "-"}`;
}

function getReporterAccountName(report: Report): string {
    const user = report.user;
    if (user && typeof user.username === "string" && user.username.trim().length > 0) {
        return user.username.trim();
    }

    if (typeof report.createdBy === "string" && report.createdBy.trim().length > 0) {
        return report.createdBy.trim();
    }

    return "Chưa cập nhật";
}

function formatReporterAccountLabel(accountName: string): string {
    return accountName === "Chưa cập nhật" ? accountName : `@${accountName}`;
}

function normalizeStatus(status?: string): ReportStatus {
    const normalized = status?.trim().toLowerCase();

    if (
        normalized === "pending" ||
        normalized === "verified" ||
        normalized === "resolved" ||
        normalized === "rejected"
    ) {
        return normalized;
    }

    return "pending";
}

export function ReportsOverview() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
    const [updatingStatusIds, setUpdatingStatusIds] = useState<Record<number, boolean>>({});
    const [statusUpdateErrors, setStatusUpdateErrors] = useState<Record<number, string>>({});

    async function handleStatusChange(report: Report, nextStatus: ReportStatus) {
        if (!report.id) {
            return;
        }

        const reportId = report.id;
        const normalizedCurrentStatus = normalizeStatus(report.status);

        if (normalizedCurrentStatus === nextStatus) {
            return;
        }

        const ownerUserId = report.userId ?? report.user?.id;

        if (!ownerUserId) {
            setStatusUpdateErrors((prev) => ({
                ...prev,
                [reportId]: "Không tìm thấy userId của báo cáo để cập nhật trạng thái.",
            }));
            return;
        }

        setUpdatingStatusIds((prev) => ({ ...prev, [reportId]: true }));
        setStatusUpdateErrors((prev) => {
            if (!prev[reportId]) {
                return prev;
            }

            const nextErrors = { ...prev };
            delete nextErrors[reportId];
            return nextErrors;
        });

        try {
            const response = await apiRequest(
                `${API_BASE_URL}/reports/update/${reportId}/admin/${ownerUserId}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status: nextStatus }),
                },
            );

            const data: unknown = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    extractErrorMessage(data, "Không thể cập nhật trạng thái báo cáo."),
                );
            }

            setReports((prev) =>
                prev.map((item) =>
                    item.id === reportId ? { ...item, status: nextStatus } : item,
                ),
            );
        } catch (error) {
            setStatusUpdateErrors((prev) => ({
                ...prev,
                [reportId]:
                    error instanceof Error
                        ? error.message
                        : "Không thể cập nhật trạng thái báo cáo.",
            }));
        } finally {
            setUpdatingStatusIds((prev) => {
                const next = { ...prev };
                delete next[reportId];
                return next;
            });
        }
    }

    useEffect(() => {
        let isMounted = true;

        async function loadReports() {
            try {
                setIsLoading(true);
                setErrorMessage(null);

                const response = await apiRequest(`${API_BASE_URL}/reports`, {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                const data: unknown = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        extractErrorMessage(data, "Không thể tải danh sách báo cáo."),
                    );
                }

                const nextReports = Array.isArray(data)
                    ? (data as Array<{ report: any; user: any }>).map((item) => ({
                        ...item.report,
                        user: item.user,
                    }))
                    : [];
                if (isMounted) {
                    setReports(nextReports);
                }
            } catch (error) {
                if (isMounted) {
                    setReports([]);
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "Không thể tải danh sách báo cáo.",
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadReports();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredReports = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        return reports
            .filter((report) => {
                const matchesStatus =
                    statusFilter === "all" ||
                    report.status?.toLowerCase() === statusFilter;

                if (!matchesStatus) {
                    return false;
                }

                if (!keyword) {
                    return true;
                }

                const searchTarget = [
                    String(report.id ?? ""),
                    report.description ?? "",
                    report.province ?? "",
                    report.ward ?? "",
                    report.addressLine ?? "",
                    formatCategory(report.category),
                    formatStatus(report.status),
                    getReporterName(report),
                    report.user?.username ?? "",
                    report.user?.name ?? "",
                ]
                    .join(" ")
                    .toLowerCase();

                return searchTarget.includes(keyword);
            })
            .sort((first, second) => {
                const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
                const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;

                return secondTime - firstTime;
            });
    }, [reports, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        return {
            total: reports.length,
            urgent: reports.filter((item) => item.isUrgent).length,
            pending: reports.filter((item) => item.status?.toLowerCase() === "pending").length,
            verified: reports.filter((item) => item.status?.toLowerCase() === "verified").length,
            resolved: reports.filter((item) => item.status?.toLowerCase() === "resolved").length,
            rejected: reports.filter((item) => item.status?.toLowerCase() === "rejected").length,
        };
    }, [reports]);

    return (
        <section className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.16),transparent_42%),linear-gradient(180deg,#f8fdff_0%,#f4f9fc_100%)] px-4 pb-10 pt-[calc(var(--navbar-height)+1.6rem)]">
            <div className="mx-auto w-full max-w-7xl space-y-3">
                <header className="rounded-3xl border border-sky-100/80 bg-white/90 p-4 shadow-[0_24px_48px_-32px_rgba(8,47,73,0.35)] backdrop-blur-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 md:text-[1.9rem]">
                                Danh sách báo cáo hiện trường
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-600">
                                Theo dõi toàn bộ báo cáo mới nhất, lọc nhanh theo trạng thái và tìm kiếm theo khu vực hoặc nội dung.
                            </p>
                        </div>
                    </div>

                    <div className="mt-2 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                        <article className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-sky-700">Tổng số</p>
                            <p className="mt-1 text-2xl font-bold text-sky-900">{stats.total}</p>
                        </article>
                        <article className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-amber-700">Đang chờ</p>
                            <p className="mt-1 text-2xl font-bold text-amber-900">{stats.pending}</p>
                        </article>
                        <article className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-sky-700">Đã xác minh</p>
                            <p className="mt-1 text-2xl font-bold text-sky-900">{stats.verified}</p>
                        </article>
                        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Đã xử lý</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.resolved}</p>
                        </article>
                        <article className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-rose-700">Đã từ chối</p>
                            <p className="mt-1 text-2xl font-bold text-rose-900">{stats.rejected}</p>
                        </article>
                    </div>
                </header>

                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <label className="flex-1">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                                Tìm kiếm
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="ID, mô tả, địa chỉ, loại báo cáo..."
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-500/35"
                            />
                        </label>

                        <label className="w-full md:w-60">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                                Trạng thái
                            </span>
                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value as "all" | ReportStatus)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-500/35"
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="pending">Đang chờ</option>
                                <option value="verified">Đã xác minh</option>
                                <option value="resolved">Đã xử lý</option>
                                <option value="rejected">Đã từ chối</option>
                            </select>
                        </label>
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                        Đang tải danh sách báo cáo...
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
                        {errorMessage}
                    </div>
                ) : null}

                {!isLoading && !errorMessage ? (
                    <>
                        {filteredReports.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
                                Không có báo cáo phù hợp với điều kiện lọc hiện tại.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {filteredReports.map((report, index) => {
                                    const thumbnail = getThumbnail(report);
                                    const reporterName = getReporterName(report);
                                    const reporterAccountName = getReporterAccountName(report);
                                    const reporterPhone = formatReporterPhone(report.user?.phone);
                                    const currentStatus = normalizeStatus(report.status);
                                    const isUpdatingStatus =
                                        report.id !== undefined
                                            ? Boolean(updatingStatusIds[report.id])
                                            : false;
                                    const statusError =
                                        report.id !== undefined
                                            ? statusUpdateErrors[report.id]
                                            : undefined;

                                    return (
                                        <article
                                            key={report.id ?? `report-${index}`}
                                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            {thumbnail ? (
                                                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                                                    <Image
                                                        src={thumbnail}
                                                        alt={`Ảnh minh chứng báo cáo #${report.id ?? ""}`}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="space-y-3 p-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(report.status)}`}
                                                    >
                                                        {formatStatus(report.status)}
                                                    </span>
                                                    {report.isUrgent ? (
                                                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                                            Khẩn cấp
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <h2 className="text-lg font-bold text-slate-900">
                                                    {formatCategory(report.category)}
                                                </h2>

                                                <p className="text-sm leading-relaxed text-slate-700">
                                                    {report.description?.trim() || "Chưa có mô tả."}
                                                </p>

                                                <dl className="grid gap-2 text-sm text-slate-600">
                                                    <div className="flex items-start gap-2">
                                                        <dt className="min-w-20 font-semibold text-slate-500">Địa điểm</dt>
                                                        <dd>
                                                            {[report.addressLine, report.ward, report.province]
                                                                .filter(Boolean)
                                                                .join(", ") || "-"}
                                                        </dd>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <dt className="min-w-20 font-semibold text-slate-500">Mức độ</dt>
                                                        <dd>{typeof report.severity === "number" ? report.severity : 0}/5</dd>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <dt className="min-w-20 font-semibold text-slate-500">Tên</dt>
                                                        <dd>{reporterName}</dd>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <dt className="min-w-20 font-semibold text-slate-500">Tài khoản</dt>
                                                        <dd>{formatReporterAccountLabel(reporterAccountName)}</dd>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <dt className="min-w-20 font-semibold text-slate-500">Điện thoại</dt>
                                                        <dd>{formatReporterPhone(reporterPhone)}</dd>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <dt className="min-w-20 font-semibold text-slate-500">Thời gian</dt>
                                                        <dd>{formatDate(report.createdAt)}</dd>
                                                    </div>
                                                </dl>

                                                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500">
                                                        Cập nhật trạng thái
                                                    </label>
                                                    <select
                                                        value={currentStatus}
                                                        onChange={(event) =>
                                                            void handleStatusChange(
                                                                report,
                                                                event.target
                                                                    .value as ReportStatus,
                                                            )
                                                        }
                                                        disabled={isUpdatingStatus}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-sky-500/35 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                    >
                                                        {REPORT_STATUS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {isUpdatingStatus ? (
                                                        <p className="text-xs text-slate-500">
                                                            Đang cập nhật trạng thái...
                                                        </p>
                                                    ) : null}
                                                    {statusError ? (
                                                        <p className="text-xs text-rose-700">{statusError}</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </section>
    );
}
