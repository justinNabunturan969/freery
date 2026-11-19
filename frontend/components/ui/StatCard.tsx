import type { ReactNode } from "react";

/**
 * One number with its label and a short explanation, plus a small icon on
 * the right.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  loading = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-card sm:p-5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        {loading ? (
          <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-slate-200" />
        ) : (
          <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-ink-strong sm:text-[32px]">
            {value}
          </p>
        )}
        {hint ? (
          loading ? (
            <div className="mt-2.5 h-3 w-32 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2.5 text-[12px] text-ink-muted">{hint}</p>
          )
        ) : null}
      </div>
      {icon ? (
        <div className="shrink-0 text-brand-300" aria-hidden="true">
          {icon}
        </div>
      ) : null}
    </div>
  );
}
