import { HTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

interface MiraCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padded?: boolean;
}

/**
 * Flat Mira card : bg blanc, border `rule`, radius xl, pas d'ombre.
 * (Distinct du `Card` shadcn générique pour garder spec design system.)
 */
export const MiraCard = forwardRef<HTMLDivElement, MiraCardProps>(function MiraCard(
  { hover, padded = true, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-rule bg-card",
        padded && "p-6",
        hover && "transition-colors hover:border-muted-soft",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
