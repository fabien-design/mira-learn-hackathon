import { Sparkles } from "lucide-react";

import type { CVImport } from "@/types/mentor";
import { MiraButton } from "@/components/mira/MiraButton";
import { SkillChip } from "@/components/mira/SkillChip";

interface CvIngestionPanelProps {
  cv: CVImport | null;
  busy: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}

function SkLine({ width }: { width: string }) {
  return <div className="sk-line h-3" style={{ width }} />;
}

export function CvIngestionPanel({
  cv,
  busy,
  onConfirm,
  onDiscard,
}: CvIngestionPanelProps) {
  if (busy || !cv || cv.status === "uploaded" || cv.status === "extracting") {
    return (
      <div className="mt-6 rounded-2xl border border-rule bg-card p-5">
        <div className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-charcoal">
          <Sparkles className="h-4 w-4 text-mira-red" strokeWidth={2} />
          Mira analyse ton profil…
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Extraction des expériences et skills depuis ton CV (30-60 s).
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <SkLine width="65%" />
          <SkLine width="78%" />
          <SkLine width="50%" />
        </div>
      </div>
    );
  }
  if (cv.status === "failed") {
    return (
      <div className="mt-6 rounded-2xl border border-error/30 bg-error/[0.05] p-5">
        <p className="text-sm font-semibold text-error">Extraction CV impossible</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {cv.error_message ?? "Réessaie avec un autre fichier ou passe en manuel."}
        </p>
        <div className="mt-3">
          <MiraButton variant="secondary" onClick={onDiscard}>
            Continuer manuellement
          </MiraButton>
        </div>
      </div>
    );
  }

  const experiences = cv.extracted_experiences_raw ?? [];
  const skills = cv.extracted_skills_raw ?? [];

  return (
    <div className="mt-6 rounded-2xl border border-rule bg-card p-5">
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal">
        <Sparkles className="h-4 w-4 text-mira-red" strokeWidth={2} />
        Mira a trouvé :
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Expériences ({experiences.length})
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {experiences.slice(0, 4).map((e, i) => (
              <li key={i} className="text-charcoal">
                <span className="font-semibold">{e.role}</span> · {e.company} ·{" "}
                <span className="text-muted-foreground">
                  {e.start_year}{e.end_year ? `–${e.end_year}` : "–"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Skills ({skills.length})
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.slice(0, 12).map((s, i) => (
              <SkillChip key={i} label={`${s.skill_slug} · ${s.level}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <MiraButton onClick={onConfirm}>Confirmer et préremplir</MiraButton>
        <MiraButton variant="secondary" onClick={onDiscard}>
          Ignorer
        </MiraButton>
      </div>
    </div>
  );
}
