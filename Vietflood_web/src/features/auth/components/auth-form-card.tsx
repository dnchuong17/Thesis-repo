import type { ReactNode } from "react";

type AuthFormCardProps = {
    title: string;
    description: string;
    note?: string;
    children: ReactNode;
};

export function AuthFormCard({ title, description, note, children }: AuthFormCardProps) {
    return (
        <main className="mx-auto grid min-h-screen w-[min(1120px,92vw)] place-items-center py-6">
            <section
                className="mx-auto w-full max-w-130 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(4,20,47,0.08)]"
                aria-label={title}
            >
                <header className="grid justify-items-center gap-1 text-center">
                    <h1 className="m-0 [font-family:var(--font-heading)] text-[clamp(1.4rem,2.5vw,2rem)]">
                        {title}
                    </h1>
                </header>
                <p className="m-0 text-slate-700 text-center">
                    {description}
                </p>

                {children}

                {note ? (
                    <p className="mt-1.5 text-center text-sm italic text-slate-600">
                        {note}
                    </p>
                ) : null}
            </section>
        </main>
    );
}
