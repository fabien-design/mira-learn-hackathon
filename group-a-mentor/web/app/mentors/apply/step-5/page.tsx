"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ChipChoice } from "@/components/wizard/ChipChoice";
import { ErrorBanner } from "@/components/wizard/ErrorBanner";
import { FieldRow } from "@/components/wizard/FieldRow";
import { Input } from "@/components/ui/input";
import type {
  ClassFormat,
  MentorApplication,
  MiraClass,
  RythmPattern,
  TargetCity,
} from "@/types/mentor";

const RYTHMS: { value: RythmPattern; label: string }[] = [
  { value: "weekly_session", label: "1 séance / semaine" },
  { value: "biweekly_session", label: "1 séance / 2 semaines" },
  { value: "monthly_workshop", label: "Workshop mensuel" },
  { value: "intensive_weekend", label: "Weekend intensif" },
  { value: "self_paced", label: "Async / self-paced" },
];

const FORMATS: { value: ClassFormat; label: string }[] = [
  { value: "virtual", label: "En ligne" },
  { value: "physical", label: "Physique" },
  { value: "both", label: "Hybride" },
];

const CITY_SUGGESTIONS: TargetCity[] = [
  { name: "Lisbonne", country_code: "PT" },
  { name: "Bali", country_code: "ID" },
  { name: "Barcelone", country_code: "ES" },
  { name: "Tbilissi", country_code: "GE" },
  { name: "Bangkok", country_code: "TH" },
  { name: "Medellín", country_code: "CO" },
  { name: "Mexico City", country_code: "MX" },
  { name: "Le Cap", country_code: "ZA" },
];

export default function Step5Page() {
  return (
    <Suspense
      fallback={
        <WizardShell currentStep={5}>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </WizardShell>
      }
    >
      <Step5Inner />
    </Suspense>
  );
}

function Step5Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get("class_id");

  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [title, setTitle] = useState("");
  const [totalCollective, setTotalCollective] = useState(10);
  const [totalIndividual, setTotalIndividual] = useState(0);
  const [rythm, setRythm] = useState<RythmPattern | null>(null);
  const [format, setFormat] = useState<ClassFormat>("both");
  const [cities, setCities] = useState<TargetCity[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      router.replace("/mentors/apply/step-4");
      return;
    }
    Promise.all([
      apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
      apiClient.get<MiraClass>(`/v1/mentors/applications/me/classes/${classId}`),
    ])
      .then(([app, cls]) => {
        if (!app || !["draft", "submitted"].includes(app.status)) {
          router.replace("/me/application");
          return;
        }
        setApplication(app);
        setTitle(cls.title ?? "");
        setTotalCollective(cls.total_hours_collective || 10);
        setTotalIndividual(cls.total_hours_individual || 0);
        setRythm(cls.rythm_pattern);
        setFormat(cls.format_envisaged || "both");
        setCities(cls.target_cities ?? []);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."));
  }, [classId, router]);

  function toggleCity(c: TargetCity) {
    setCities((prev) =>
      prev.find((x) => x.name === c.name)
        ? prev.filter((x) => x.name !== c.name)
        : [...prev, c],
    );
  }

  async function handleContinue() {
    if (!classId) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/v1/mentors/applications/me/classes/${classId}`, {
        title: title.trim(),
        total_hours_collective: totalCollective,
        total_hours_individual: totalIndividual,
        total_hours: totalCollective + totalIndividual,
        rythm_pattern: rythm,
        format_envisaged: format,
        target_cities: format === "virtual" ? [] : cities,
      });
      router.push(`/mentors/apply/step-6?class_id=${classId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sauvegarde impossible.");
      setSaving(false);
    }
  }

  const canContinue =
    title.trim().length > 0 &&
    rythm !== null &&
    totalCollective + totalIndividual > 0;

  return (
    <WizardShell currentStep={5}>
      <WizardStepHeader
        eyebrow="Étape 5 · Format & lieux"
        title={
          <>
            Comment ça <span className="font-serif-italic">se déroule ?</span>
          </>
        }
        subtitle="Titre, durées, rythme et lieux — tu peux tout ajuster tant que la candidature est modifiable."
      />
      <ErrorBanner message={error} />

      <FieldRow label="Titre de la Mira Class" hint="200 caractères max. Visible par les nomades une fois publiée.">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          placeholder="Ex. Lancer un SaaS B2B en nomadisme"
          className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
        />
      </FieldRow>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <FieldRow label="Heures collectives (estimées)">
          <Input
            type="number"
            min={0}
            value={totalCollective}
            onChange={(e) => setTotalCollective(Number(e.target.value) || 0)}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <FieldRow label="Heures individuelles (1:1)">
          <Input
            type="number"
            min={0}
            value={totalIndividual}
            onChange={(e) => setTotalIndividual(Number(e.target.value) || 0)}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
      </section>

      <FieldRow label="Rythme" className="mt-8">
        <div className="flex flex-wrap gap-2">
          {RYTHMS.map((r) => (
            <ChipChoice
              key={r.value}
              selected={rythm === r.value}
              onClick={() => setRythm(r.value)}
            >
              {r.label}
            </ChipChoice>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Format" className="mt-8">
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <ChipChoice
              key={f.value}
              selected={format === f.value}
              onClick={() => setFormat(f.value)}
            >
              {f.label}
            </ChipChoice>
          ))}
        </div>
      </FieldRow>

      {format !== "virtual" && (
        <FieldRow
          label="Villes envisagées"
          hint="Sélectionne 1 ou plusieurs villes où tu peux animer."
          className="mt-8"
        >
          <div className="flex flex-wrap gap-2">
            {CITY_SUGGESTIONS.map((c) => (
              <ChipChoice
                key={c.name}
                selected={!!cities.find((x) => x.name === c.name)}
                onClick={() => toggleCity(c)}
              >
                {c.name} · {c.country_code}
              </ChipChoice>
            ))}
          </div>
        </FieldRow>
      )}

      <WizardFooter
        prevHref="/mentors/apply/step-4"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        saving={saving}
        draftSavedLabel={application ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}
