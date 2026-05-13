import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MethodCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  badge?: string;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function MethodCard({
  title,
  description,
  icon,
  badge,
  disabled,
  selected,
  onClick,
}: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border bg-card p-6 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-mira-red ring-2 ring-mira-red/15"
          : "border-rule hover:border-muted-soft",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-warm-beige text-mira-red">
              {icon}
            </span>
          )}
          <h3 className="text-base font-semibold text-charcoal">{title}</h3>
        </div>
        {badge && (
          <span className="rounded-full bg-beige-deep px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}
