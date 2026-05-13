"use client";

import { cn } from "@/lib/utils";
import type { MiraClass } from "@/types/mentor";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/mira/StatusBadge";

interface ProposedClassCardProps {
  mc: MiraClass;
  decision?: "validated_draft" | "rejected";
  rejectionReason?: string;
  onSetDecision?: (next: "validated_draft" | "rejected") => void;
  onSetReason?: (v: string) => void;
}

const RYTHM_LABEL: Record<string, string> = {
  weekly_session: "1 séance/semaine",
  biweekly_session: "1 séance/2 sem.",
  monthly_workshop: "workshop mensuel",
  intensive_weekend: "weekend intensif",
  self_paced: "self-paced",
};

export function ProposedClassCard({
  mc,
  decision,
  rejectionReason,
  onSetDecision,
  onSetReason,
}: ProposedClassCardProps) {
  return (
    <div className="rounded-2xl border border-rule bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-serif text-[19px] font-medium leading-snug tracking-tight text-charcoal">
            {mc.title}
          </h4>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {mc.total_hours_collective}h coll. + {mc.total_hours_individual}h indiv. · {mc.format_envisaged}
            {mc.rythm_pattern ? ` · ${RYTHM_LABEL[mc.rythm_pattern] ?? mc.rythm_pattern}` : ""}
          </p>
        </div>
        <StatusBadge status={mc.status === "validated_draft" ? "validated" : (mc.status === "rejected" ? "rejected" : "submitted")} />
      </div>
      {mc.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
          {mc.description}
        </p>
      )}
      {onSetDecision && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSetDecision("validated_draft")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
              decision === "validated_draft"
                ? "border-mira-red bg-mira-red text-white"
                : "border-rule bg-card text-charcoal hover:border-muted-soft",
            )}
          >
            Valider
          </button>
          <button
            type="button"
            onClick={() => onSetDecision("rejected")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
              decision === "rejected"
                ? "border-error bg-error text-white"
                : "border-rule bg-card text-charcoal hover:border-muted-soft",
            )}
          >
            Rejeter
          </button>
          {decision === "rejected" && onSetReason && (
            <Input
              value={rejectionReason ?? ""}
              onChange={(e) => onSetReason(e.target.value)}
              placeholder="Raison du rejet"
              className="h-9 flex-1 rounded-lg border-rule bg-card text-[12.5px] focus-visible:border-mira-red focus-visible:ring-mira-red/15"
            />
          )}
        </div>
      )}
    </div>
  );
}
