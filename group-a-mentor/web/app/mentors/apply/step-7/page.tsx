"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ErrorBanner } from "@/components/wizard/ErrorBanner";
import { Eyebrow } from "@/components/mira/Eyebrow";
import { MiraCard } from "@/components/mira/MiraCard";
import { SkillChip } from "@/components/mira/SkillChip";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ApplicationSkill,
  MentorApplication,
  MiraClass,
  Skill,
} from "@/types/mentor";

export default function Step7Page() {
  const router = useRouter();
  const [app, setApp] = useState<MentorApplication | null>(null);
  const [classes, setClasses] = useState<MiraClass[]>([]);
  const [skills, setSkills] = useState<ApplicationSkill[]>([]);
  const [skillsCatalogue, setSkillsCatalogue] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [acceptSincerity, setAcceptSincerity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
      apiClient.get<MiraClass[]>("/v1/mentors/applications/me/classes"),
      apiClient.get<ApplicationSkill[]>("/v1/mentors/applications/me/skills"),
      apiClient.get<Skill[]>("/v1/skills"),
    ])
      .then(([a, c, s, sk]) => {
        if (!a) {
          router.replace("/mentors/apply/step-1");
          return;
        }
        if (!["draft", "submitted"].includes(a.status)) {
          router.replace("/me/application");
          return;
        }
        setApp(a);
        setClasses(c);
        setSkills(s);
        setSkillsCatalogue(sk);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit() {
    if (!acceptConditions || !acceptSincerity || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/v1/mentors/applications/me/submit");
      router.push("/me/application");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Soumission impossible.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <WizardShell currentStep={7}>
        <Skeleton className="h-8 w-1/2 rounded-xl" />
        <Skeleton className="mt-4 h-24 rounded-2xl" />
        <Skeleton className="mt-3 h-24 rounded-2xl" />
      </WizardShell>
    );
  }

  const skillsById = new Map(skillsCatalogue.map((s) => [s.id, s]));

  return (
    <WizardShell currentStep={7}>
      <WizardStepHeader
        eyebrow="Étape 7 · Récap & soumission"
        title={
          <>
            Prêt(e) à <span className="font-serif-italic">soumettre ?</span>
          </>
        }
      />
      <ErrorBanner message={error} />

      <section className="grid gap-4 md:grid-cols-2">
        <MiraCard>
          <Eyebrow>Identité</Eyebrow>
          <p className="mt-2 text-base font-semibold text-charcoal">
            {app?.first_name} {app?.last_name}
          </p>
          {app?.nomad_since_year !== null && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Nomade depuis {app?.nomad_since_year}
            </p>
          )}
        </MiraCard>
        <MiraCard>
          <Eyebrow>Skills ({skills.length})</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <SkillChip
                key={s.id}
                primary={i < 3}
                label={`${skillsById.get(s.skill_id)?.name ?? s.skill_id} · ${s.level}`}
              />
            ))}
          </div>
        </MiraCard>
      </section>

      <MiraCard className="mt-4">
        <Eyebrow>Mira Classes proposées ({classes.length})</Eyebrow>
        <ul className="mt-2 space-y-2">
          {classes.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune class.</li>
          )}
          {classes.map((c) => (
            <li key={c.id} className="rounded-xl bg-warm-beige p-4">
              <p className="text-sm font-semibold text-charcoal">{c.title}</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {c.total_hours_collective}h coll. + {c.total_hours_individual}h indiv. ·{" "}
                {c.format_envisaged}
                {c.rythm_pattern ? ` · ${c.rythm_pattern.replace("_", " ")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </MiraCard>

      <section className="mt-8 space-y-3">
        <Checkbox
          checked={acceptConditions}
          onChange={(v) => setAcceptConditions(v)}
          label="J'accepte les conditions Mira Mentor (marge plateforme 25 %, code de conduite, exclusivité non requise)."
        />
        <Checkbox
          checked={acceptSincerity}
          onChange={(v) => setAcceptSincerity(v)}
          label="Je certifie que les informations fournies sont exactes."
        />
      </section>

      <WizardFooter
        prevHref="/mentors/apply/step-6"
        onContinue={handleSubmit}
        continueLabel="Soumettre ma candidature"
        continueDisabled={!acceptConditions || !acceptSincerity}
        saving={submitting}
        draftSavedLabel="Brouillon enregistré"
      />
    </WizardShell>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-mira-red"
      />
      <span className="text-sm leading-relaxed text-charcoal">{label}</span>
    </label>
  );
}
