"use client";

import { Check, RefreshCw, X } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";

interface DecisionBlockProps {
  candidateFirstName: string;
  comment: string;
  onCommentChange: (v: string) => void;
  submitting: string | null;
  alreadyInReview?: boolean;
  onValidate: () => void;
  onReject: () => void;
  onInReview: () => void;
}

export function DecisionBlock({
  candidateFirstName,
  comment,
  onCommentChange,
  submitting,
  alreadyInReview,
  onValidate,
  onReject,
  onInReview,
}: DecisionBlockProps) {
  return (
    <MiraCard className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-warm-beige text-charcoal">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <h3 className="text-lg font-semibold text-charcoal">Décision</h3>
      </div>
      <label className="block text-[12.5px] font-semibold text-charcoal">
        Commentaire <span className="font-normal text-muted-foreground">· visible uniquement par l'équipe Mira</span>
      </label>
      <Textarea
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Ex. Très bon angle DTC. Vérifier ses références avant validation."
        className="mt-2 min-h-24 rounded-xl border-rule bg-card p-4 text-sm focus-visible:border-mira-red focus-visible:ring-mira-red/15"
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <MiraButton
          variant="destructive"
          onClick={onReject}
          disabled={submitting !== null}
          leadingIcon={<X className="h-3.5 w-3.5" strokeWidth={2.2} />}
        >
          {submitting === "rejected" ? "..." : "Refuser"}
        </MiraButton>
        <div className="ml-auto flex flex-wrap gap-2">
          <MiraButton
            variant="secondary"
            onClick={onInReview}
            disabled={submitting !== null || alreadyInReview}
            leadingIcon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />}
          >
            {submitting === "in_review" ? "..." : "Mettre en examen"}
          </MiraButton>
          <MiraButton
            onClick={onValidate}
            disabled={submitting !== null}
            leadingIcon={<Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
          >
            {submitting === "validated"
              ? "..."
              : `Valider ${candidateFirstName} comme mentor`}
          </MiraButton>
        </div>
      </div>
    </MiraCard>
  );
}
