import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Bouton vanilla Tailwind.
 *
 * MIGRATION HINT (post-hackathon) :
 *   Remplacer par `import { Button } from "@hlmr-travel/ui-public"` qui apporte :
 *     - Variants tunés design Mira (primary, secondary, ghost, destructive)
 *     - Tailles standardisées (sm, md, lg)
 *     - Loading state intégré avec spinner
 *     - icon prop (Solar icons)
 *     - Animation hover/active Framer Motion
 *
 *   Ce fichier (`components/ui/Button.tsx`) sera supprimé post-migration.
 */
type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-white hover:opacity-90",
  outline: "border border-gray-300 bg-white hover:bg-gray-50",
  ghost: "hover:bg-gray-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mira-red/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
