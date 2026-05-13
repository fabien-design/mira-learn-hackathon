import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";

import { cn } from "@/lib/utils";

type MiraButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type MiraButtonSize = "default" | "sm";

interface MiraButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MiraButtonVariant;
  size?: MiraButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<MiraButtonVariant, string> = {
  primary:
    "bg-mira-red text-white border-transparent hover:bg-mira-red-hover",
  secondary:
    "bg-card text-charcoal border-muted-soft hover:border-charcoal",
  ghost:
    "bg-transparent text-mira-red border-transparent hover:bg-mira-red/[0.06]",
  destructive:
    "bg-error text-white border-transparent hover:bg-[#DC2626]",
};

const SIZE_CLASSES: Record<MiraButtonSize, string> = {
  default: "h-11 rounded-xl px-5 text-sm",
  sm: "h-9 rounded-lg px-3.5 text-[13px]",
};

/**
 * Bouton Mira aligné design-system (hauteur 44px, transitions douces, pas d'ombre).
 * Différent du `Button` shadcn générique qui est très compact.
 */
export const MiraButton = forwardRef<HTMLButtonElement, MiraButtonProps>(function MiraButton(
  {
    variant = "primary",
    size = "default",
    leadingIcon,
    trailingIcon,
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mira-red/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
