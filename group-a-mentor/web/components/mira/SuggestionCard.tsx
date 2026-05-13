"use client";

import { useState } from "react";
import { Flame, Sparkles, Sprout, Users } from "lucide-react";

import type { ClassSuggestion, Skill } from "@/types/mentor";
import { cn } from "@/lib/utils";

import { MiraButton } from "./MiraButton";
import { SkillChip } from "./SkillChip";

const REJECT_REASONS: { value: string; label: string }[] = [
  { value: "not_my_expertise", label: "Pas mon expertise" },
  { value: "not_interested", label: "Pas intéressé" },
  { value: "too_generic", label: "Trop générique" },
  { value: "duplicate", label: "Déjà couvert" },
  { value: "other", label: "Autre" },
];

interface SuggestionCardProps {
  suggestion: ClassSuggestion;
  skillsById: Map<string, Skill>;
  adopting?: boolean;
  onAdopt: () => void;
  onReject: (reason: string) => void;
}

function DemandSignal({ gap, demand }: { gap: number; demand: number }) {
  const hot = gap > 30;
  const med = gap > 5;
  const Icon = hot ? Flame : med ? Users : Sprout;
  const tone = hot ? "text-mira-red bg-mira-red/[0.08]" : med ? "text-gold bg-gold/[0.12]" : "text-muted-foreground bg-beige-deep";
  return (
    <span
      title={`Demand=${demand} · Gap=${gap}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tone,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {hot ? "fort signal" : med ? "demande" : "niche"}
    </span>
  );
}

export function SuggestionCard({
  suggestion,
  skillsById,
  adopting,
  onAdopt,
  onReject,
}: SuggestionCardProps) {
  const [showReject, setShowReject] = useState(false);
  const skillNames = suggestion.suggested_skill_ids
    .map((id) => skillsById.get(id)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <article className="flex h-full flex-col rounded-2xl border border-rule bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[18px] font-medium leading-snug tracking-tight text-charcoal">
          {suggestion.suggested_title}
        </h3>
        <DemandSignal
          gap={Number(suggestion.skill_offer_gap_score)}
          demand={Number(suggestion.skill_demand_score)}
        />
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
        {suggestion.suggested_description}
      </p>
      {skillNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skillNames.slice(0, 4).map((name, i) => (
            <SkillChip key={name} label={name} primary={i === 0} />
          ))}
        </div>
      )}
      <div className="mt-3 inline-flex items-start gap-2 rounded-xl bg-warm-beige px-3 py-2.5 text-[12.5px] italic leading-relaxed text-charcoal">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mira-red" strokeWidth={2} />
        <span className="line-clamp-3">{suggestion.justification}</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <MiraButton onClick={onAdopt} disabled={adopting}>
          {adopting ? "..." : "Adopter"}
        </MiraButton>
        <MiraButton variant="secondary" onClick={() => setShowReject((v) => !v)}>
          Pas pour moi
        </MiraButton>
      </div>
      {showReject && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {REJECT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onReject(r.value)}
              className="rounded-full border border-rule bg-card px-3 py-1 text-[12px] text-charcoal hover:bg-warm-beige"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
