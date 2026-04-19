import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  accent?: "emerald" | "amber" | "blue" | "violet" | "slate";
}

const accentStyles = {
  emerald:
    "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white text-emerald-800",
  amber:
    "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white text-amber-800",
  blue: "border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white text-blue-800",
  violet:
    "border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white text-violet-800",
  slate: "border-slate-200 bg-white shadow-sm text-slate-900",
};

export default function StatCard({
  label,
  value,
  sublabel,
  icon,
  accent = "slate",
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${accentStyles[accent]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
          {sublabel && <p className="mt-0.5 text-xs opacity-70">{sublabel}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/60 text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
