import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/mentor";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  in_review: "En examen",
  validated: "Validée",
  rejected: "Refusée",
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  draft: "bg-(--status-draft-bg) text-(--status-draft-fg)",
  submitted:
    "bg-(--status-submitted-bg) text-(--status-submitted-fg)",
  in_review:
    "bg-(--status-inreview-bg) text-(--status-inreview-fg)",
  validated:
    "bg-(--status-validated-bg) text-(--status-validated-fg)",
  rejected:
    "bg-(--status-rejected-bg) text-(--status-rejected-fg)",
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-5",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
