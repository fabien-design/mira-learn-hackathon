import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string;
  note?: string;
  variant?: "default" | "accent" | "muted";
  className?: string;
}

export function Stat({ label, value, note, variant = "default", className }: StatProps) {
  return (
    <div className={cn("rounded-xl bg-warm-beige px-5 py-4", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-serif text-[22px] font-medium tracking-tight",
          variant === "accent" && "text-mira-red",
          variant === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
      {note && (
        <div className="mt-0.5 text-[12px] text-muted-foreground">{note}</div>
      )}
    </div>
  );
}
