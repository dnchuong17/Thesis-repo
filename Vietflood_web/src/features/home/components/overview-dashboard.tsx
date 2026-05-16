"use client";

import { useState } from "react";

import { ReportsOverview } from "@/features/reports/components/reports-overview";

import { UsersOverview } from "./users-overview";

type OverviewTab = "users" | "reports";

const TAB_LABELS: Record<OverviewTab, string> = {
    users: "Người dùng",
    reports: "Báo cáo",
};

export function OverviewDashboard() {
    const [activeTab, setActiveTab] = useState<OverviewTab>("users");

    return (
        <div className="relative h-full">
            {activeTab === "users" ? <UsersOverview /> : <ReportsOverview />}

            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 md:justify-end md:px-6">
                <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/92 p-1.5 shadow-[0_14px_30px_-20px_rgba(2,132,199,0.75)] backdrop-blur-md">
                    {(Object.keys(TAB_LABELS) as OverviewTab[]).map((tab) => {
                        const isActive = tab === activeTab;

                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive
                                    ? "bg-sky-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {TAB_LABELS[tab]}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
