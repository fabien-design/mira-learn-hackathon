import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldRowProps {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FieldRow({ label, hint, className, children }: FieldRowProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-[12.5px] font-semibold text-charcoal">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
