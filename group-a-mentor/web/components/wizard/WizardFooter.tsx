"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { MiraButton } from "@/components/mira/MiraButton";

interface WizardFooterProps {
  prevHref?: string;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  saving?: boolean;
  draftSavedLabel?: string;
}

export function WizardFooter({
  prevHref,
  onContinue,
  continueLabel = "Continuer",
  continueDisabled,
  saving,
  draftSavedLabel = "Brouillon enregistré",
}: WizardFooterProps) {
  const router = useRouter();
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
      <div>
        {prevHref && (
          <MiraButton
            variant="ghost"
            onClick={() => router.push(prevHref)}
            disabled={saving}
            leadingIcon={<ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />}
          >
            Retour
          </MiraButton>
        )}
      </div>
      <div className="flex items-center gap-4">
        {draftSavedLabel && (
          <span className="text-[12.5px] italic text-muted-foreground">{draftSavedLabel}</span>
        )}
        <MiraButton
          onClick={onContinue}
          disabled={continueDisabled || saving}
          trailingIcon={!saving ? <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /> : undefined}
        >
          {saving ? "Enregistrement…" : continueLabel}
        </MiraButton>
      </div>
    </div>
  );
}
