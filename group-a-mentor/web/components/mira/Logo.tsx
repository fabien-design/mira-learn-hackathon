import { cn } from "@/lib/utils";

interface LogoProps {
  admin?: boolean;
  className?: string;
}

export function MiraLogo({ admin, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-mira-red text-sm font-bold leading-none tracking-tight text-white">
        M
      </span>
      <span className="inline-flex items-baseline gap-1.5 text-[15px] font-semibold text-charcoal">
        Mira
        <span className="text-[12px] font-bold tracking-[0.16em] text-mira-red">
          LEARN
        </span>
        {admin && (
          <span className="text-[13px] font-medium text-muted-foreground">· admin</span>
        )}
      </span>
    </span>
  );
}
