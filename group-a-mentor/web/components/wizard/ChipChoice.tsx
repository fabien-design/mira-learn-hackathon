import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

interface ChipChoiceProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Chip de saisie wizard : selectable pill. */
export const ChipChoice = forwardRef<HTMLButtonElement, ChipChoiceProps>(
  function ChipChoice({ selected, className, type = "button", children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
          selected
            ? "border-mira-red bg-mira-red text-white"
            : "border-rule bg-card text-charcoal hover:border-muted-soft",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
