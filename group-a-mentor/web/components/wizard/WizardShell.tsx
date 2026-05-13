import Link from "next/link";
import { ReactNode } from "react";

import { MiraLogo } from "@/components/mira/Logo";
import { WizardProgress } from "@/components/wizard/WizardProgress";

interface WizardShellProps {
  currentStep: number;
  children: ReactNode;
}

export function WizardShell({ currentStep, children }: WizardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-rule bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between px-6 md:px-8">
          <Link href="/">
            <MiraLogo />
          </Link>
          <Link
            href="/mentors"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-charcoal"
          >
            ← Quitter
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1320px] px-6 pb-28 pt-10 md:px-8">
        <WizardProgress currentStep={currentStep} />
        <div className="mt-12 max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
