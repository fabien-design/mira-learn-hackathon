import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-xl border border-rule bg-card p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-warm-beige text-charcoal"
                : "text-muted-foreground hover:text-charcoal",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  active ? "bg-card text-charcoal" : "bg-beige-deep text-charcoal",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
