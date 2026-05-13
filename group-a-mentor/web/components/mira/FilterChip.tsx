import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  function FilterChip({ active, className, type = "button", children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors",
          active
            ? "border-charcoal bg-charcoal text-white"
            : "border-muted-soft bg-transparent text-charcoal hover:bg-black/[0.03]",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
