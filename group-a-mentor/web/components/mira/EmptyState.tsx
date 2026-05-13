import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rule bg-card px-6 py-12 text-center">
      {icon && (
        <span className="inline-flex h-12 w-12 items-center justify-center text-muted-foreground">
          {icon}
        </span>
      )}
      <h3 className="text-base font-semibold text-charcoal">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
