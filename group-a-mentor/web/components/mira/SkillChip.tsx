import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface SkillChipProps {
  label: string;
  primary?: boolean;
  validated?: boolean;
  className?: string;
}

export function SkillChip({ label, primary, validated, className }: SkillChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13.5px] font-medium",
        primary
          ? "bg-sage-soft text-[#2D4A1F]"
          : "bg-beige-deep text-charcoal",
        className,
      )}
    >
      {primary && <Star className="h-3 w-3" strokeWidth={2.5} />}
      {validated && !primary && <span aria-hidden>✓</span>}
      {label}
    </span>
  );
}
