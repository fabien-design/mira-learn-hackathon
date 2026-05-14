import { Fragment } from "react";

import { cn } from "@/lib/utils";

export const STEP_LABELS = [
  "Identité",
  "Import",
  "Profil",
  "Masterclass",
  "Format",
  "Simulation",
  "Soumission",
] as const;

interface WizardProgressProps {
  currentStep: number; // 1-based
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const currentLabel = STEP_LABELS[currentStep - 1];
  const progressPct = ((currentStep - 1) / (STEP_LABELS.length - 1)) * 100;

  return (
    <>
      {/* Mobile: compact progress bar */}
      <div className="flex items-center gap-3 md:hidden">
        <span className="shrink-0 text-xs font-semibold text-foreground">
          Étape {currentStep} / {STEP_LABELS.length}
        </span>
        <span className="text-xs text-muted-foreground">· {currentLabel}</span>
        <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Desktop: full step row */}
      <div className="hidden items-center gap-3 md:flex">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < currentStep;
          const active = n === currentStep;
          return (
            <Fragment key={label}>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-foreground text-background",
                    !done && !active && "border border-border text-muted-foreground",
                  )}
                >
                  {done ? "✓" : n}
                </span>
                {active && (
                  <span className="whitespace-nowrap text-xs font-semibold text-foreground">
                    {label}
                  </span>
                )}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <span
                  className={cn(
                    "h-0.5 min-w-3 flex-1 rounded transition-colors",
                    n < currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
