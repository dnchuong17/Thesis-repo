import type { ReactNode } from "react";

type AuthLayoutProps = {
    children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] text-slate-900">
            <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -top-16 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,rgba(15,23,42,0.08),transparent_58%)]" />

            <main className="relative grid min-h-screen place-items-center px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
