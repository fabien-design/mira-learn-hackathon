import type { ProfessionalExperience } from "@/types/mentor";

interface JourneyTimelineProps {
  items: ProfessionalExperience[];
}

export function JourneyTimeline({ items }: JourneyTimelineProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune expérience renseignée.</p>;
  }
  return (
    <ol className="relative pl-6">
      <span aria-hidden className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-rule" />
      {items.map((e, i) => (
        <li key={i} className={i === items.length - 1 ? "relative" : "relative pb-5"}>
          <span
            aria-hidden
            className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-mira-red bg-card"
          />
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {e.start_year} – {e.end_year ?? "en cours"}
          </div>
          <div className="mt-0.5 text-[15px] font-semibold text-charcoal">
            {e.role} · {e.company}
          </div>
          {e.description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {e.description}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
