import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface EyebrowProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "muted" | "accent";
}

export function Eyebrow({
  tone = "muted",
  className,
  children,
  ...rest
}: EyebrowProps) {
  return (
    <div
      className={cn(
        "text-[11.5px] font-semibold uppercase tracking-[0.08em]",
        tone === "accent" ? "text-mira-red" : "text-muted-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
