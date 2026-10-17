import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 text-card-foreground", className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-2", className)}>
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
        {title}
      </h3>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

const tones = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};
export type Tone = keyof typeof tones;

export function ProgressBar({ value, tone = "primary", label }: { value: number; tone?: Tone; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-elevated"
    >
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | Tone }) {
  const map = {
    muted: "bg-elevated text-muted-foreground",
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", map[tone])}>{children}</span>;
}

export function StatCard({ icon: Icon, label, value, hint, tone = "primary" }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  const iconTone = { primary: "text-primary bg-accent", success: "text-success bg-success/15", warning: "text-warning bg-warning/15", danger: "text-danger bg-danger/15" }[tone];
  return (
    <Panel>
      <div className="flex items-start justify-between">
        <span className={cn("grid size-9 place-items-center rounded-lg", iconTone)}>
          <Icon className="size-4" aria-hidden />
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <p className="font-display mt-4 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
    </Panel>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-elevated", className)}>{children}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">{text}</p>;
}
