import { ReactNode } from "react";

import { Eyebrow } from "@/components/mira/Eyebrow";

interface WizardStepHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
}

export function WizardStepHeader({ eyebrow, title, subtitle }: WizardStepHeaderProps) {
  return (
    <header className="mb-8">
      <Eyebrow tone="accent">{eyebrow}</Eyebrow>
      <h1 className="mt-3 max-w-2xl font-serif text-[clamp(2rem,3.5vw,2.75rem)] font-medium leading-tight tracking-tight text-charcoal">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </header>
  );
}
