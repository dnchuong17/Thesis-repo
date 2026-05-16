"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useGlobalAlert } from "@/components/feedback/global-alert-provider";
import { getAuthIdentity } from "@/features/auth/lib/auth-storage";
import { apiRequest } from "@/features/auth/lib/api-client";

const DEFAULT_AUTH_API_BASE_URL = "https://vietflood-app.azurewebsites.net";

const AUTH_API_BASE_URL =
    process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? DEFAULT_AUTH_API_BASE_URL;
const USERS_PER_PAGE = 20;

const PROVINCE_OPTIONS = [
    "An Giang",
    "Bắc Ninh",
    "Cao Bằng",
    "Cà Mau",
    "Cần Thơ",
    "Đà Nẵng",
    "Đắk Lắk",
    "Điện Biên",
    "Đồng Nai",
    "Đồng Tháp",
    "Gia Lai",
    "Hà Nội",
    "Hà Tĩnh",
    "Hải Phòng",
    "Hưng Yên",
    "Huế",
    "Khánh Hòa",
    "Lai Châu",
    "Lâm Đồng",
    "Lạng Sơn",
    "Lào Cai",
    "Nghệ An",
    "Ninh Bình",
    "Phú Thọ",
    "Quảng Ngãi",
    "Quảng Ninh",
    "Quảng Trị",
    "Sơn La",
    "Tây Ninh",
    "Thanh Hóa",
    "Thái Nguyên",
    "Tuyên Quang",
    "Vĩnh Long",
    "TP.HCM",
];

type User = {
    id?: number;
    username?: string;
    email?: string;
    phone?: string;
    address_line?: string;
    role?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    province?: string;
    ward?: string;
    created_at?: string;
};

type SortKey = "id" | "fullName" | "username" | "email" | "role" | "created_at";

type FilterState = {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
};

function formatFullName(user: User): string {
    const parts = [user.first_name, user.middle_name ?? "", user.last_name]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean);

    if (parts.length === 0) {
        return user.username?.trim() || "Chưa có thông tin";
    }

    return parts.join(" ");
}

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
    }).format(date);
}

function formatRole(role?: string): string {
    const normalized = role?.trim().toLowerCase();
    if (normalized === "admin") {
        return "Quản trị viên";
    }
    if (normalized === "operator") {
        return "Điều phối viên";
    }
    if (normalized === "citizen") {
        return "Người dân";
    }
    return role?.trim() || "-";
}

export function UsersOverview() {
    const { showAlert } = useGlobalAlert();
    const [users, setUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeColumnMenu, setActiveColumnMenu] = useState<SortKey | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        id: "",
        fullName: "",
        username: "",
        email: "",
        role: "",
        created_at: "",
    });
    const [sortConfig, setSortConfig] = useState<{
        key: SortKey;
        direction: "asc" | "desc";
    }>({
        key: "id",
        direction: "asc",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        phone: "",
        province: "",
        ward: "",
        address_line: "",
        password: "",
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "operator" | "citizen">("all");

    useEffect(() => {
        async function loadUsers() {
            try {
                setIsLoading(true);
                setErrorMessage(null);

                const response = await apiRequest(`${AUTH_API_BASE_URL}/auth/all`, {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                const data: unknown = await response.json().catch(() => null);

                if (!response.ok) {
                    const fallback = "Không thể tải danh sách người dùng.";
                    if (typeof data === "object" && data !== null && "message" in data) {
                        const message = (data as { message?: unknown }).message;
                        if (typeof message === "string" && message.trim().length > 0) {
                            throw new Error(message);
                        }
                    }

                    throw new Error(fallback);
                }

                const nextUsers = Array.isArray(data) ? (data as User[]) : [];
                setUsers(nextUsers);
                setCurrentPage(1);
            } catch (error) {
                setUsers([]);
                setCurrentPage(1);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Không thể tải danh sách người dùng.",
                );
            } finally {
                setIsLoading(false);
            }
        }

        void loadUsers();
    }, []);

    const totalUsers = users.length;
    const adminCount = useMemo(
        () => users.filter((user) => user.role?.toLowerCase() === "admin").length,
        [users],
    );
    const operatorCount = useMemo(
        () => users.filter((user) => user.role?.toLowerCase() === "operator").length,
        [users],
    );
    const citizenCount = useMemo(
        () => users.filter((user) => user.role?.toLowerCase() === "citizen").length,
        [users],
    );
    const filteredAndSortedUsers = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        const nextUsers = users.filter((user) => {
            const fullName = formatFullName(user).toLowerCase();
            const username = (user.username ?? "").toLowerCase();
            const email = (user.email ?? "").toLowerCase();
            const role = formatRole(user.role).toLowerCase();
            const createdAt = formatDate(user.created_at).toLowerCase();
            const id = String(user.id ?? "").toLowerCase();
            const rawRole = (user.role ?? "").trim().toLowerCase();

            const matchesQuickRole = roleFilter === "all" || rawRole === roleFilter;
            const matchesQuickSearch =
                !keyword ||
                [
                    id,
                    fullName,
                    username,
                    email,
                    role,
                    user.province ?? "",
                    user.ward ?? "",
                    user.address_line ?? "",
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword);

            return (
                id.includes(filters.id.trim().toLowerCase()) &&
                fullName.includes(filters.fullName.trim().toLowerCase()) &&
                username.includes(filters.username.trim().toLowerCase()) &&
                email.includes(filters.email.trim().toLowerCase()) &&
                role.includes(filters.role.trim().toLowerCase()) &&
                createdAt.includes(filters.created_at.trim().toLowerCase()) &&
                matchesQuickRole &&
                matchesQuickSearch
            );
        });

        const sortedUsers = [...nextUsers].sort((first, second) => {
            let firstValue: number | string = "";
            let secondValue: number | string = "";

            switch (sortConfig.key) {
                case "id":
                    firstValue = first.id ?? 0;
                    secondValue = second.id ?? 0;
                    break;
                case "fullName":
                    firstValue = formatFullName(first).toLowerCase();
                    secondValue = formatFullName(second).toLowerCase();
                    break;
                case "username":
                    firstValue = (first.username ?? "").toLowerCase();
                    secondValue = (second.username ?? "").toLowerCase();
                    break;
                case "email":
                    firstValue = (first.email ?? "").toLowerCase();
                    secondValue = (second.email ?? "").toLowerCase();
                    break;
                case "role":
                    firstValue = formatRole(first.role).toLowerCase();
                    secondValue = formatRole(second.role).toLowerCase();
                    break;
                case "created_at":
                    firstValue = first.created_at ? new Date(first.created_at).getTime() : 0;
                    secondValue = second.created_at ? new Date(second.created_at).getTime() : 0;
                    break;
                default:
                    break;
            }

            if (typeof firstValue === "number" && typeof secondValue === "number") {
                return sortConfig.direction === "asc"
                    ? firstValue - secondValue
                    : secondValue - firstValue;
            }

            const comparison = String(firstValue).localeCompare(String(secondValue), "vi");
            return sortConfig.direction === "asc" ? comparison : -comparison;
        });

        return sortedUsers;
    }, [filters, roleFilter, searchTerm, sortConfig, users]);
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / USERS_PER_PAGE));
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * USERS_PER_PAGE;
        return filteredAndSortedUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
    }, [filteredAndSortedUsers, currentPage]);
    const pageStartRecord = filteredAndSortedUsers.length === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
    const pageEndRecord = Math.min(currentPage * USERS_PER_PAGE, filteredAndSortedUsers.length);
    const authIdentity = getAuthIdentity();
    const isAdmin = authIdentity?.role?.toLowerCase() === "admin";
    const canEditSelectedUser =
        !!selectedUser &&
        ((!!authIdentity?.username && selectedUser.username === authIdentity.username) || isAdmin);

    useEffect(() => {
        if (!selectedUser) {
            return;
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                if (isSaveConfirmOpen && !isSaving) {
                    setIsSaveConfirmOpen(false);
                    return;
                }

                if (isDeleteConfirmOpen && !isDeleting) {
                    setIsDeleteConfirmOpen(false);
                    return;
                }

                if (!isSaving && !isDeleting) {
                    setSelectedUser(null);
                }
            }
        }

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isDeleteConfirmOpen, isDeleting, isSaveConfirmOpen, isSaving, selectedUser]);

    useEffect(() => {
        if (!selectedUser) {
            setIsEditing(false);
            setIsSaveConfirmOpen(false);
            setIsDeleteConfirmOpen(false);
            return;
        }

        setEditForm({
            phone: selectedUser.phone ?? "",
            province: selectedUser.province ?? "",
            ward: selectedUser.ward ?? "",
            address_line: selectedUser.address_line ?? "",
            password: "",
        });
        setIsEditing(false);
    }, [selectedUser]);

    useEffect(() => {
        setCurrentPage((prevPage) => Math.min(prevPage, totalPages));
    }, [totalPages]);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            const target = event.target as HTMLElement;
            const clickedTrigger = target.closest("[data-column-trigger]");
            const clickedMenu = target.closest("[data-column-menu]");

            if (!clickedTrigger && !clickedMenu) {
                setActiveColumnMenu(null);
            }
        }

        window.addEventListener("mousedown", handleOutsideClick);
        return () => window.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    async function handleSaveUserDetail() {
        if (!selectedUser) {
            return;
        }

        if (!canEditSelectedUser) {
            showAlert({
                title: "Không có quyền cập nhật",
                description: "Bạn không có quyền cập nhật tài khoản này.",
                variant: "error",
            });
            return;
        }

        try {
            setIsSaveConfirmOpen(false);
            setIsSaving(true);

            const payload: Record<string, string> = {
                phone: editForm.phone.trim(),
                province: editForm.province.trim(),
                ward: editForm.ward.trim(),
                address_line: editForm.address_line.trim(),
            };

            if (editForm.password.trim().length > 0) {
                payload.password = editForm.password.trim();
            }

            if (isAdmin && !selectedUser.id) {
                throw new Error("Không tìm thấy ID người dùng để cập nhật.");
            }

            const updateEndpoint =
                isAdmin && selectedUser.id
                    ? `${AUTH_API_BASE_URL}/auth/update/user/${selectedUser.id}`
                    : `${AUTH_API_BASE_URL}/auth/update`;

            const response = await apiRequest(updateEndpoint, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data: unknown = await response.json().catch(() => null);
            if (!response.ok) {
                if (typeof data === "object" && data !== null && "message" in data) {
                    const message = (data as { message?: unknown }).message;
                    if (typeof message === "string" && message.trim().length > 0) {
                        throw new Error(message);
                    }
                }

                throw new Error("Cập nhật người dùng thất bại.");
            }

            const updatedUser: User = {
                ...selectedUser,
                phone: payload.phone,
                province: payload.province,
                ward: payload.ward,
                address_line: payload.address_line,
            };

            setSelectedUser(updatedUser);
            setUsers((prevUsers) =>
                prevUsers.map((user) => {
                    if (user.id !== updatedUser.id) {
                        return user;
                    }

                    return {
                        ...user,
                        phone: updatedUser.phone,
                        province: updatedUser.province,
                        ward: updatedUser.ward,
                        address_line: updatedUser.address_line,
                    };
                }),
            );
            setEditForm((prev) => ({ ...prev, password: "" }));
            setIsEditing(false);
            setIsSaveConfirmOpen(false);
            setIsDeleteConfirmOpen(false);
            showAlert({
                title: "Cập nhật thành công",
                description: "Thông tin người dùng đã được cập nhật.",
                variant: "success",
            });
        } catch (error) {
            const updateErrorMessage =
                error instanceof Error ? error.message : "Cập nhật người dùng thất bại.";

            showAlert({
                title: "Cập nhật thất bại",
                description: updateErrorMessage,
                variant: "error",
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteUser() {
        if (!selectedUser?.id) {
            showAlert({
                title: "Xóa người dùng thất bại",
                description: "Không tìm thấy ID người dùng để xóa.",
                variant: "error",
            });
            return;
        }

        const deletedUserName = formatFullName(selectedUser);

        try {
            setIsDeleting(true);
            setIsDeleteConfirmOpen(false);

            const response = await apiRequest(
                `${AUTH_API_BASE_URL}/auth/delete/${selectedUser.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                },
            );

            const data: unknown = await response.json().catch(() => null);
            if (!response.ok) {
                if (typeof data === "object" && data !== null && "message" in data) {
                    const message = (data as { message?: unknown }).message;
                    if (typeof message === "string" && message.trim().length > 0) {
                        throw new Error(message);
                    }
                }

                throw new Error("Xóa người dùng thất bại.");
            }

            setUsers((prevUsers) => prevUsers.filter((user) => user.id !== selectedUser.id));
            setSelectedUser(null);
            showAlert({
                title: "Xóa thành công",
                description: `Đã xóa người dùng ${deletedUserName}.`,
                variant: "success",
            });
        } catch (error) {
            const deleteErrorMessage =
                error instanceof Error ? error.message : "Xóa người dùng thất bại.";

            showAlert({
                title: "Xóa người dùng thất bại",
                description: deleteErrorMessage,
                variant: "error",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    function handleSort(column: SortKey, direction?: "asc" | "desc") {
        setSortConfig((prev) => {
            if (direction) {
                return {
                    key: column,
                    direction,
                };
            }

            if (prev.key === column) {
                return {
                    key: column,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                };
            }

            return {
                key: column,
                direction: "asc",
            };
        });
    }

    function handleFilterChange(column: keyof FilterState, value: string) {
        setFilters((prev) => ({ ...prev, [column]: value }));
        setCurrentPage(1);
    }

    function toggleColumnMenu(column: SortKey) {
        setActiveColumnMenu((prev) => (prev === column ? null : column));
    }

    return (
        <section className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.16),transparent_42%),linear-gradient(180deg,#f8fdff_0%,#f4f9fc_100%)] px-4 pb-10 pt-[calc(var(--navbar-height)+1.6rem)]">
            <div className="mx-auto w-full max-w-7xl space-y-3">
                <header className="rounded-3xl border border-sky-100/80 bg-white/90 p-4 shadow-[0_24px_48px_-32px_rgba(8,47,73,0.35)] backdrop-blur-sm">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 md:text-[1.9rem]">
                            Tổng quan tài khoản hệ thống
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-600">
                            Theo dõi nhanh số lượng người dùng theo vai trò và quản lý danh sách chi tiết ngay bên dưới.
                        </p>
                    </div>

                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <article className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-sky-700">Tổng tài khoản</p>
                            <p className="mt-1 text-2xl font-bold text-sky-900">{totalUsers}</p>
                        </article>
                        <article className="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-teal-700">Quản trị viên</p>
                            <p className="mt-1 text-2xl font-bold text-teal-900">{adminCount}</p>
                        </article>
                        <article className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-indigo-700">Điều phối viên</p>
                            <p className="mt-1 text-2xl font-bold text-indigo-900">{operatorCount}</p>
                        </article>
                        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Người dân</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-900">{citizenCount}</p>
                        </article>
                    </div>
                </header>

                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <label className="flex-1">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                                Tìm kiếm nhanh
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="ID, tên, username, email, địa chỉ..."
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-500/35"
                            />
                        </label>

                        <label className="w-full md:w-60">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                                Vai trò
                            </span>
                            <select
                                value={roleFilter}
                                onChange={(event) => {
                                    setRoleFilter(event.target.value as "all" | "admin" | "operator" | "citizen");
                                    setCurrentPage(1);
                                }}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-500/35"
                            >
                                <option value="all">Tất cả vai trò</option>
                                <option value="admin">Quản trị viên</option>
                                <option value="operator">Điều phối viên</option>
                                <option value="citizen">Người dân</option>
                            </select>
                        </label>
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                        Đang tải danh sách người dùng...
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
                        {errorMessage}
                    </div>
                ) : null}

                {!isLoading && !errorMessage ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto overflow-y-visible">
                            <table className="min-w-full divide-y divide-slate-200 text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="relative px-3 py-2 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-left">ID</span>
                                                <button
                                                    type="button"
                                                    data-column-trigger
                                                    className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200"
                                                    onClick={() => toggleColumnMenu("id")}
                                                    aria-label="Tùy chỉnh ID"
                                                    title="Tùy chỉnh ID"
                                                >
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
                                                        <path d="m19.4 15 .1.1a1 1 0 0 1 .2 1.1l-.1.2-.9 1.6a1 1 0 0 1-1.2.4l-.2-.1-1.1-.6a7.9 7.9 0 0 1-1.7 1l-.2 1.2a1 1 0 0 1-.9.8H10a1 1 0 0 1-1-.8l-.2-1.2a7.9 7.9 0 0 1-1.7-1l-1.1.6a1 1 0 0 1-1.3-.3l-.1-.2-.9-1.6a1 1 0 0 1 .2-1.2l.1-.1 1-.9a8.2 8.2 0 0 1 0-2l-1-.9a1 1 0 0 1-.2-1.2l.1-.2.9-1.6A1 1 0 0 1 6 5.7l.2.1 1.1.6a7.9 7.9 0 0 1 1.7-1l.2-1.2a1 1 0 0 1 1-.8h2a1 1 0 0 1 1 .8l.2 1.2a7.9 7.9 0 0 1 1.7 1l1.1-.6a1 1 0 0 1 1.3.3l.1.2.9 1.6a1 1 0 0 1-.2 1.2l-.1.1-1 .9a8.2 8.2 0 0 1 0 2l1 .9Z" />
                                                    </svg>
                                                </button>
                                            </div>
                                            {activeColumnMenu === "id" ? (
                                                <div data-column-menu className="absolute left-3 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-xl">
                                                    <div className="mb-2 flex gap-2">
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("id", "asc")}>Tăng dần</button>
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("id", "desc")}>Giảm dần</button>
                                                    </div>
                                                    <input type="text" value={filters.id} onChange={(event) => handleFilterChange("id", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40" placeholder="Lọc ID..." />
                                                </div>
                                            ) : null}
                                        </th>
                                        <th className="relative px-3 py-2 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-left">Họ tên</span>
                                                <button type="button" data-column-trigger className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200" onClick={() => toggleColumnMenu("fullName")} aria-label="Tùy chỉnh Họ tên" title="Tùy chỉnh Họ tên">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" /><path d="m19.4 15 .1.1a1 1 0 0 1 .2 1.1l-.1.2-.9 1.6a1 1 0 0 1-1.2.4l-.2-.1-1.1-.6a7.9 7.9 0 0 1-1.7 1l-.2 1.2a1 1 0 0 1-.9.8H10a1 1 0 0 1-1-.8l-.2-1.2a7.9 7.9 0 0 1-1.7-1l-1.1.6a1 1 0 0 1-1.3-.3l-.1-.2-.9-1.6a1 1 0 0 1 .2-1.2l.1-.1 1-.9a8.2 8.2 0 0 1 0-2l-1-.9a1 1 0 0 1-.2-1.2l.1-.2.9-1.6A1 1 0 0 1 6 5.7l.2.1 1.1.6a7.9 7.9 0 0 1 1.7-1l.2-1.2a1 1 0 0 1 1-.8h2a1 1 0 0 1 1 .8l.2 1.2a7.9 7.9 0 0 1 1.7 1l1.1-.6a1 1 0 0 1 1.3.3l.1.2.9 1.6a1 1 0 0 1-.2 1.2l-.1.1-1 .9a8.2 8.2 0 0 1 0 2l1 .9Z" /></svg>
                                                </button>
                                            </div>
                                            {activeColumnMenu === "fullName" ? (
                                                <div data-column-menu className="absolute right-3 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-xl">
                                                    <div className="mb-2 flex gap-2">
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("fullName", "asc")}>Tăng dần</button>
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("fullName", "desc")}>Giảm dần</button>
                                                    </div>
                                                    <input type="text" value={filters.fullName} onChange={(event) => handleFilterChange("fullName", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40" placeholder="Lọc họ tên..." />
                                                </div>
                                            ) : null}
                                        </th>
                                        <th className="relative px-3 py-2 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-left">Username</span>
                                                <button type="button" data-column-trigger className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200" onClick={() => toggleColumnMenu("username")} aria-label="Tùy chỉnh Username" title="Tùy chỉnh Username">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" /><path d="m19.4 15 .1.1a1 1 0 0 1 .2 1.1l-.1.2-.9 1.6a1 1 0 0 1-1.2.4l-.2-.1-1.1-.6a7.9 7.9 0 0 1-1.7 1l-.2 1.2a1 1 0 0 1-.9.8H10a1 1 0 0 1-1-.8l-.2-1.2a7.9 7.9 0 0 1-1.7-1l-1.1.6a1 1 0 0 1-1.3-.3l-.1-.2-.9-1.6a1 1 0 0 1 .2-1.2l.1-.1 1-.9a8.2 8.2 0 0 1 0-2l-1-.9a1 1 0 0 1-.2-1.2l.1-.2.9-1.6A1 1 0 0 1 6 5.7l.2.1 1.1.6a7.9 7.9 0 0 1 1.7-1l.2-1.2a1 1 0 0 1 1-.8h2a1 1 0 0 1 1 .8l.2 1.2a7.9 7.9 0 0 1 1.7 1l1.1-.6a1 1 0 0 1 1.3.3l.1.2.9 1.6a1 1 0 0 1-.2 1.2l-.1.1-1 .9a8.2 8.2 0 0 1 0 2l1 .9Z" /></svg>
                                                </button>
                                            </div>
                                            {activeColumnMenu === "username" ? (
                                                <div data-column-menu className="absolute right-3 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-xl">
                                                    <div className="mb-2 flex gap-2">
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("username", "asc")}>Tăng dần</button>
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("username", "desc")}>Giảm dần</button>
                                                    </div>
                                                    <input type="text" value={filters.username} onChange={(event) => handleFilterChange("username", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40" placeholder="Lọc username..." />
                                                </div>
                                            ) : null}
                                        </th>
                                        <th className="relative px-3 py-2 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-left">Email</span>
                                                <button type="button" data-column-trigger className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200" onClick={() => toggleColumnMenu("email")} aria-label="Tùy chỉnh Email" title="Tùy chỉnh Email">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" /><path d="m19.4 15 .1.1a1 1 0 0 1 .2 1.1l-.1.2-.9 1.6a1 1 0 0 1-1.2.4l-.2-.1-1.1-.6a7.9 7.9 0 0 1-1.7 1l-.2 1.2a1 1 0 0 1-.9.8H10a1 1 0 0 1-1-.8l-.2-1.2a7.9 7.9 0 0 1-1.7-1l-1.1.6a1 1 0 0 1-1.3-.3l-.1-.2-.9-1.6a1 1 0 0 1 .2-1.2l.1-.1 1-.9a8.2 8.2 0 0 1 0-2l-1-.9a1 1 0 0 1-.2-1.2l.1-.2.9-1.6A1 1 0 0 1 6 5.7l.2.1 1.1.6a7.9 7.9 0 0 1 1.7-1l.2-1.2a1 1 0 0 1 1-.8h2a1 1 0 0 1 1 .8l.2 1.2a7.9 7.9 0 0 1 1.7 1l1.1-.6a1 1 0 0 1 1.3.3l.1.2.9 1.6a1 1 0 0 1-.2 1.2l-.1.1-1 .9a8.2 8.2 0 0 1 0 2l1 .9Z" /></svg>
                                                </button>
                                            </div>
                                            {activeColumnMenu === "email" ? (
                                                <div data-column-menu className="absolute right-3 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-xl">
                                                    <div className="mb-2 flex gap-2">
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("email", "asc")}>Tăng dần</button>
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("email", "desc")}>Giảm dần</button>
                                                    </div>
                                                    <input type="text" value={filters.email} onChange={(event) => handleFilterChange("email", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40" placeholder="Lọc email..." />
                                                </div>
                                            ) : null}
                                        </th>
                                        <th className="relative px-3 py-2 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-left">Vai trò</span>
                                                <button type="button" data-column-trigger className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200" onClick={() => toggleColumnMenu("role")} aria-label="Tùy chỉnh Vai trò" title="Tùy chỉnh Vai trò">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" /><path d="m19.4 15 .1.1a1 1 0 0 1 .2 1.1l-.1.2-.9 1.6a1 1 0 0 1-1.2.4l-.2-.1-1.1-.6a7.9 7.9 0 0 1-1.7 1l-.2 1.2a1 1 0 0 1-.9.8H10a1 1 0 0 1-1-.8l-.2-1.2a7.9 7.9 0 0 1-1.7-1l-1.1.6a1 1 0 0 1-1.3-.3l-.1-.2-.9-1.6a1 1 0 0 1 .2-1.2l.1-.1 1-.9a8.2 8.2 0 0 1 0-2l-1-.9a1 1 0 0 1-.2-1.2l.1-.2.9-1.6A1 1 0 0 1 6 5.7l.2.1 1.1.6a7.9 7.9 0 0 1 1.7-1l.2-1.2a1 1 0 0 1 1-.8h2a1 1 0 0 1 1 .8l.2 1.2a7.9 7.9 0 0 1 1.7 1l1.1-.6a1 1 0 0 1 1.3.3l.1.2.9 1.6a1 1 0 0 1-.2 1.2l-.1.1-1 .9a8.2 8.2 0 0 1 0 2l1 .9Z" /></svg>
                                                </button>
                                            </div>
                                            {activeColumnMenu === "role" ? (
                                                <div data-column-menu className="absolute right-3 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-xl">
                                                    <div className="mb-2 flex gap-2">
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("role", "asc")}>Tăng dần</button>
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("role", "desc")}>Giảm dần</button>
                                                    </div>
                                                    <input type="text" value={filters.role} onChange={(event) => handleFilterChange("role", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40" placeholder="Lọc vai trò..." />
                                                </div>
                                            ) : null}
                                        </th>
                                        <th className="relative px-3 py-2 align-top text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-left">Ngày tạo</span>
                                                <button type="button" data-column-trigger className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200" onClick={() => toggleColumnMenu("created_at")} aria-label="Tùy chỉnh Ngày tạo" title="Tùy chỉnh Ngày tạo">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" /><path d="m19.4 15 .1.1a1 1 0 0 1 .2 1.1l-.1.2-.9 1.6a1 1 0 0 1-1.2.4l-.2-.1-1.1-.6a7.9 7.9 0 0 1-1.7 1l-.2 1.2a1 1 0 0 1-.9.8H10a1 1 0 0 1-1-.8l-.2-1.2a7.9 7.9 0 0 1-1.7-1l-1.1.6a1 1 0 0 1-1.3-.3l-.1-.2-.9-1.6a1 1 0 0 1 .2-1.2l.1-.1 1-.9a8.2 8.2 0 0 1 0-2l-1-.9a1 1 0 0 1-.2-1.2l.1-.2.9-1.6A1 1 0 0 1 6 5.7l.2.1 1.1.6a7.9 7.9 0 0 1 1.7-1l.2-1.2a1 1 0 0 1 1-.8h2a1 1 0 0 1 1 .8l.2 1.2a7.9 7.9 0 0 1 1.7 1l1.1-.6a1 1 0 0 1 1.3.3l.1.2.9 1.6a1 1 0 0 1-.2 1.2l-.1.1-1 .9a8.2 8.2 0 0 1 0 2l1 .9Z" /></svg>
                                                </button>
                                            </div>
                                            {activeColumnMenu === "created_at" ? (
                                                <div data-column-menu className="absolute right-3 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-xl">
                                                    <div className="mb-2 flex gap-2">
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("created_at", "asc")}>Tăng dần</button>
                                                        <button type="button" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleSort("created_at", "desc")}>Giảm dần</button>
                                                    </div>
                                                    <input type="text" value={filters.created_at} onChange={(event) => handleFilterChange("created_at", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40" placeholder="Lọc dd/mm/yyyy" />
                                                </div>
                                            ) : null}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedUsers.map((user) => {
                                        return (
                                            <tr
                                                key={user.id ?? `${user.username ?? "user"}-${user.email ?? ""}`}
                                                className="cursor-pointer transition hover:bg-teal-50/60"
                                                onClick={() => setSelectedUser(user)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        setSelectedUser(user);
                                                    }
                                                }}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{user.id ?? "-"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{formatFullName(user)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{user.username ?? "-"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{user.email ?? "-"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-teal-700">{formatRole(user.role)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDate(user.created_at)}</td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                                                Không có người dùng phù hợp với bộ lọc hiện tại.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                            <p className="text-sm text-slate-600">
                                Hiển thị {pageStartRecord}-{pageEndRecord} / {filteredAndSortedUsers.length} người dùng
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Trước
                                </button>
                                <span className="text-sm font-semibold text-slate-700">
                                    Trang {currentPage}/{totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {selectedUser ? (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
                        onClick={() => {
                            if (!isSaving && !isDeleting) {
                                setSelectedUser(null);
                            }
                        }}
                    >
                        <div
                            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Thông tin chi tiết người dùng"
                        >
                            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-700">Chi tiết người dùng</p>
                                    <h2 className="mt-1 text-xl font-bold text-slate-900">{formatFullName(selectedUser)}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditing ? (
                                        <button
                                            type="button"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={() => {
                                                setIsEditing(true);
                                            }}
                                            disabled={!canEditSelectedUser || isDeleting}
                                            aria-label="Chỉnh sửa"
                                            title="Chỉnh sửa"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9" />
                                                <path d="m16.5 3.5 4 4L7 21l-4 1 1-4L16.5 3.5Z" />
                                            </svg>
                                        </button>
                                    ) : null}
                                    {!isEditing ? (
                                        <button
                                            type="button"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={() => setIsDeleteConfirmOpen(true)}
                                            disabled={isSaving || isDeleting}
                                            aria-label="Delete"
                                            title="Delete"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M8 6V4h8v2" />
                                                <path d="M19 6l-1 14H6L5 6" />
                                                <path d="M10 10v6" />
                                                <path d="M14 10v6" />
                                            </svg>
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() => {
                                            if (isDeleteConfirmOpen) {
                                                setIsDeleteConfirmOpen(false);
                                                return;
                                            }

                                            setSelectedUser(null);
                                        }}
                                        disabled={isSaving || isDeleting}
                                        aria-label="Đóng"
                                        title="Đóng"
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <path d="M6 6l12 12" />
                                            <path d="M18 6 6 18" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {!canEditSelectedUser ? (
                                <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    Bạn không có quyền chỉnh sửa tài khoản này.
                                </div>
                            ) : null}

                            <div className="px-5 py-4">
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="flex flex-col gap-4">
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Mã user</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedUser.id ?? "-"}</p>
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Username</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedUser.username ?? "-"}</p>
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Số điện thoại</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.phone}
                                                    onChange={(event) =>
                                                        setEditForm((prev) => ({ ...prev, phone: event.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                                                    placeholder="Nhập số điện thoại"
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedUser.phone ?? "-"}</p>
                                            )}
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Tỉnh/Thành phố</p>
                                            {isEditing ? (
                                                <select
                                                    value={editForm.province}
                                                    onChange={(event) =>
                                                        setEditForm((prev) => ({ ...prev, province: event.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                                                    disabled={isSaving}
                                                >
                                                    <option value="">Chọn tỉnh/thành phố</option>
                                                    {!PROVINCE_OPTIONS.includes(editForm.province) && editForm.province ? (
                                                        <option value={editForm.province}>{editForm.province}</option>
                                                    ) : null}
                                                    {PROVINCE_OPTIONS.map((province) => (
                                                        <option key={province} value={province}>
                                                            {province}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedUser.province ?? "-"}</p>
                                            )}
                                        </article>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Vai trò</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatRole(selectedUser.role)}</p>
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                                            <p className="mt-1 break-all text-sm font-semibold text-slate-900">{selectedUser.email ?? "-"}</p>
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Ngày tạo</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedUser.created_at)}</p>
                                        </article>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Phường/Xã</p>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.ward}
                                                    onChange={(event) =>
                                                        setEditForm((prev) => ({ ...prev, ward: event.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                                                    placeholder="Nhập phường/xã"
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedUser.ward ?? "-"}</p>
                                            )}
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Đổi mật khẩu</p>
                                            {isEditing ? (
                                                <input
                                                    type="password"
                                                    value={editForm.password}
                                                    onChange={(event) =>
                                                        setEditForm((prev) => ({ ...prev, password: event.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                                                    placeholder="Để trống nếu không đổi"
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <p className="mt-1 text-sm font-semibold text-slate-900">********</p>
                                            )}
                                        </article>
                                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Địa chỉ chi tiết</p>
                                            {isEditing ? (
                                                <textarea
                                                    rows={2}
                                                    value={editForm.address_line}
                                                    onChange={(event) =>
                                                        setEditForm((prev) => ({ ...prev, address_line: event.target.value }))
                                                    }
                                                    className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500/40"
                                                    placeholder="Nhập số nhà, đường..."
                                                    disabled={isSaving}
                                                />
                                            ) : (
                                                <p className="mt-1 min-h-10 whitespace-pre-wrap text-sm font-semibold text-slate-900">{selectedUser.address_line ?? "-"}</p>
                                            )}
                                        </article>
                                    </div>
                                </div>
                            </div>

                            {isEditing ? (
                                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                                    <button
                                        type="button"
                                        className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditForm({
                                                phone: selectedUser.phone ?? "",
                                                province: selectedUser.province ?? "",
                                                ward: selectedUser.ward ?? "",
                                                address_line: selectedUser.address_line ?? "",
                                                password: "",
                                            });
                                        }}
                                        disabled={isSaving}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() => setIsSaveConfirmOpen(true)}
                                        disabled={isSaving || isDeleting}
                                    >
                                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <ConfirmDialog
                    isOpen={!!selectedUser && isSaveConfirmOpen}
                    title="Lưu thay đổi"
                    description={
                        <>
                            Bạn có chắc chắn muốn lưu các thay đổi cho tài khoản
                            <span className="font-semibold text-slate-900"> {selectedUser ? formatFullName(selectedUser) : ""}</span>
                            ?
                        </>
                    }
                    confirmLabel="Xác nhận lưu"
                    onCancel={() => setIsSaveConfirmOpen(false)}
                    onConfirm={() => void handleSaveUserDetail()}
                    isConfirming={isSaving}
                />

                <ConfirmDialog
                    isOpen={!!selectedUser && isDeleteConfirmOpen}
                    title="Xóa người dùng"
                    description={
                        <>
                            Bạn có chắc chắn muốn xóa tài khoản
                            <span className="font-semibold text-slate-900"> {selectedUser ? formatFullName(selectedUser) : ""}</span>
                            ? Hành động này không thể hoàn tác.
                        </>
                    }
                    confirmLabel="Xác nhận xóa"
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={() => void handleDeleteUser()}
                    isConfirming={isDeleting}
                    danger
                />
            </div>
        </section>
    );
}
