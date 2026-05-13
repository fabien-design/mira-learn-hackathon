import { ArrowRight } from "lucide-react";

import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";
import type { MiraClass } from "@/types/mentor";

const FORMAT_LABELS: Record<string, string> = {
  physical: "Présentiel",
  virtual: "En ligne",
  both: "Live hybride",
};

const RYTHM_LABELS: Record<string, string> = {
  weekly_session: "Hebdomadaire",
  biweekly_session: "Bimensuel",
  monthly_workshop: "Mensuel",
  intensive_weekend: "Week-end intensif",
  self_paced: "À ton rythme",
};

interface MentorClassCardProps {
  miraClass: MiraClass;
}

export function MentorClassCard({ miraClass: c }: MentorClassCardProps) {
  const priceCents = c.recommended_price_per_hour_collective_cents;
  const priceLabel = priceCents > 0 ? `${Math.round(priceCents / 100)} €/h` : "Sur devis";
  const formatLabel = FORMAT_LABELS[c.format_envisaged] ?? c.format_envisaged;
  const rythmLabel = c.rythm_pattern ? (RYTHM_LABELS[c.rythm_pattern] ?? c.rythm_pattern) : null;

  return (
    <MiraCard padded={false} className="p-6">
      <h4 className="font-serif text-[19px] font-medium leading-snug tracking-tight text-charcoal">
        {c.title}
      </h4>
      {c.description && (
        <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">
          {c.description}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <ParamRow label="Prix" value={priceLabel} />
        <ParamRow label="Format" value={formatLabel} />
        <ParamRow label="Durée" value={`${c.total_hours} h`} />
        {rythmLabel && <ParamRow label="Rythme" value={rythmLabel} />}
      </div>
      <MiraButton
        className="mt-5 w-full"
        trailingIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
      >
        Découvrir
      </MiraButton>
    </MiraCard>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-[15px] font-semibold text-charcoal">{value}</div>
    </div>
  );
}
