"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ChipChoice } from "@/components/wizard/ChipChoice";
import { ErrorBanner } from "@/components/wizard/ErrorBanner";
import { FieldRow } from "@/components/wizard/FieldRow";
import { Input } from "@/components/ui/input";
import type { MentorApplication } from "@/types/mentor";


type NomadSinceChip =
  | "Moins d'un an"
  | "1 – 2 ans"
  | "3 – 5 ans"
  | "Plus de 5 ans"
  | "Pas encore — je prépare le saut";

type PriorClassesChip = "regular" | "few" | "informal" | "never";

const NOMAD_SINCE_OPTIONS: NomadSinceChip[] = [
  "Moins d'un an",
  "1 – 2 ans",
  "3 – 5 ans",
  "Plus de 5 ans",
  "Pas encore — je prépare le saut",
];

const PRIOR_CLASSES_LABELS: Record<PriorClassesChip, string> = {
  regular: "Oui, régulièrement",
  few: "Quelques-unes",
  informal: "Du mentoring informel",
  never: "Jamais — ce serait une première",
};

const date = new Date();

const NOMAD_SINCE_TO_YEAR: Record<NomadSinceChip, number|null> = {
  "Moins d'un an": date.getFullYear(),
  "1 – 2 ans": date.getFullYear() - 1,
  "3 – 5 ans": date.getFullYear() - 4,
  "Plus de 5 ans": date.getFullYear() - 6,
  "Pas encore — je prépare le saut": null,
};

const PRIOR_CLASSES_TO_COUNT: Record<PriorClassesChip, number> = {
  regular: 5,
  few: 3,
  informal: 1,
  never: 0,
};

function yearToNomadChip(year: number | null): NomadSinceChip {
  if (year === null) return "Pas encore — je prépare le saut";
  if (year >= 2025) return "Moins d'un an";
  if (year >= 2024) return "1 – 2 ans";
  if (year >= 2021) return "3 – 5 ans";
  return "Plus de 5 ans";
}

function countToPriorChip(count: number): PriorClassesChip {
  if (count >= 5) return "regular";
  if (count >= 3) return "few";
  if (count >= 1) return "informal";
  return "never";
}

export default function Step1Page() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nomadSince, setNomadSince] = useState<NomadSinceChip | null>(null);
  const [priorClasses, setPriorClasses] = useState<PriorClassesChip | null>(null);

  const [existing, setExisting] = useState<MentorApplication | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    nomadSince !== null &&
    priorClasses !== null;

  useEffect(() => {
    apiClient
      .get<MentorApplication | null>("/v1/mentors/applications/me")
      .then((data) => {
        if (!data) return;
        if (data.status === "draft") {
          setExisting(data);
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setNomadSince(yearToNomadChip(data.nomad_since_year));
          setPriorClasses(countToPriorChip(data.prior_masterclasses_count));
        } else {
          router.replace("/me/application");
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [router]);

  async function handleSubmit() {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      nomad_since_year: NOMAD_SINCE_TO_YEAR[nomadSince!],
      prior_masterclasses_count: PRIOR_CLASSES_TO_COUNT[priorClasses!],
    };
    try {
      if (existing) {
        await apiClient.patch("/v1/mentors/applications/me", payload);
      } else {
        await apiClient.post("/v1/mentors/applications", payload);
      }
      router.push("/mentors/apply/step-2");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau.");
      setSaving(false);
    }
  }

  if (initialLoading) {
    return (
      <WizardShell currentStep={1}>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </WizardShell>
    );
  }

  return (
    <WizardShell currentStep={1}>
      <WizardStepHeader
        eyebrow="Étape 1 · Identité"
        title={
          <>
            Commençons par <span className="font-serif-italic">te connaître.</span>
          </>
        }
        subtitle="On ne te demande que l'essentiel. Le reste arrive après."
      />
      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FieldRow label="Prénom">
          <Input
            placeholder="Emma"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <FieldRow label="Nom">
          <Input
            placeholder="Rossi"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
      </div>

      <FieldRow label="Depuis combien de temps es-tu nomade ?" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {NOMAD_SINCE_OPTIONS.map((opt) => (
            <ChipChoice
              key={opt}
              selected={nomadSince === opt}
              onClick={() => setNomadSince(opt)}
            >
              {opt}
            </ChipChoice>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="As-tu déjà animé des masterclasses ?" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PRIOR_CLASSES_LABELS) as [PriorClassesChip, string][]).map(
            ([val, lbl]) => (
              <ChipChoice
                key={val}
                selected={priorClasses === val}
                onClick={() => setPriorClasses(val)}
              >
                {lbl}
              </ChipChoice>
            ),
          )}
        </div>
        {priorClasses === "never" && (
          <p className="mt-2 rounded-xl bg-mira-red/[0.05] px-4 py-3 text-sm leading-relaxed text-charcoal">
            Pas un souci — on t'accompagne pour ta première. La majorité de nos mentors
            n'avaient jamais enseigné avant Mira.
          </p>
        )}
      </FieldRow>

      <WizardFooter
        onContinue={handleSubmit}
        continueDisabled={!isValid}
        saving={saving}
        draftSavedLabel={existing ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}
