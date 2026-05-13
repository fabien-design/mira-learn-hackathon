"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ErrorBanner } from "@/components/wizard/ErrorBanner";
import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";
import { SuggestionCard } from "@/components/mira/SuggestionCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassSuggestion, MentorApplication, MiraClass, Skill } from "@/types/mentor";

export default function Step4Page() {
  const router = useRouter();
  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [suggestions, setSuggestions] = useState<ClassSuggestion[]>([]);
  const [skillsById, setSkillsById] = useState<Map<string, Skill>>(new Map());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [adopting, setAdopting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
      apiClient.get<ClassSuggestion[]>(
        "/v1/mentors/applications/me/class-suggestions?status=proposed",
      ),
      apiClient.get<Skill[]>("/v1/skills"),
    ])
      .then(([app, sugg, skills]) => {
        if (!app) {
          router.replace("/mentors/apply/step-1");
          return;
        }
        if (app.status !== "draft") {
          router.replace("/me/application");
          return;
        }
        setApplication(app);
        setSuggestions(sugg);
        setSkillsById(new Map(skills.map((s) => [s.id, s])));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [router]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const rows = await apiClient.post<ClassSuggestion[]>(
        "/v1/mentors/applications/me/class-suggestions/generate",
        { count: 3 },
      );
      setSuggestions(rows);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Génération impossible.");
    } finally {
      setGenerating(false);
    }
  }

  async function adopt(id: string) {
    setAdopting(id);
    setError(null);
    try {
      const mc = await apiClient.post<MiraClass>(
        `/v1/mentors/applications/me/class-suggestions/${id}/adopt`,
        {},
      );
      router.push(`/mentors/apply/step-5?class_id=${mc.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Adoption impossible.");
      setAdopting(null);
    }
  }

  async function reject(id: string, reason: string) {
    setError(null);
    try {
      await apiClient.post(
        `/v1/mentors/applications/me/class-suggestions/${id}/reject`,
        { reason },
      );
      setSuggestions(suggestions.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Rejet impossible.");
    }
  }

  async function createManual() {
    if (!manualTitle.trim()) return;
    setError(null);
    try {
      const mc = await apiClient.post<MiraClass>(
        "/v1/mentors/applications/me/classes",
        {
          title: manualTitle.trim(),
          description: "",
          skills_taught: [],
          total_hours: 0,
          format_envisaged: "both",
        },
      );
      router.push(`/mentors/apply/step-5?class_id=${mc.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Création impossible.");
    }
  }

  async function continueExisting() {
    try {
      const classes = await apiClient.get<MiraClass[]>(
        "/v1/mentors/applications/me/classes",
      );
      const draft = classes.find((c) => c.status === "draft");
      if (draft) router.push(`/mentors/apply/step-5?class_id=${draft.id}`);
      else setError("Adopte une suggestion ou crée ta propre Mira Class avant de continuer.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau.");
    }
  }

  return (
    <WizardShell currentStep={4}>
      <WizardStepHeader
        eyebrow="Étape 4 · Masterclass"
        title={
          <>
            Mira AI <span className="font-serif-italic">te propose.</span>
          </>
        }
        subtitle="D'après tes skills et la demande des nomades, voici 3 sujets de Mira Class à fort potentiel."
      />
      <ErrorBanner message={error} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : suggestions.length === 0 ? (
        <MiraCard className="flex flex-col items-center gap-3 border-dashed py-10 text-center">
          <Sparkles className="h-8 w-8 text-mira-red" strokeWidth={1.5} />
          <p className="font-serif text-lg text-charcoal">
            Demande à Mira de te suggérer 3 sujets de masterclass.
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Croisement entre tes skills et la demande actuelle des nomades.
          </p>
          <MiraButton onClick={generate} disabled={generating}>
            {generating ? "Mira réfléchit…" : "Générer 3 suggestions"}
          </MiraButton>
        </MiraCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                skillsById={skillsById}
                adopting={adopting === s.id}
                onAdopt={() => adopt(s.id)}
                onReject={(reason) => reject(s.id, reason)}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <MiraButton
              variant="secondary"
              size="sm"
              onClick={generate}
              disabled={generating}
              leadingIcon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />}
            >
              {generating ? "Mira réfléchit…" : "Regénérer 3 nouvelles"}
            </MiraButton>
          </div>
        </>
      )}

      <MiraCard className="mt-10">
        <h3 className="text-base font-semibold text-charcoal">Proposer la mienne</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu sais déjà ce que tu veux enseigner ? Donne un titre.
        </p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <Input
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Ex. Pitcher pour lever 500k"
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15 md:flex-1"
          />
          <MiraButton onClick={createManual} disabled={!manualTitle.trim()}>
            Créer et continuer
          </MiraButton>
        </div>
      </MiraCard>

      <WizardFooter
        prevHref="/mentors/apply/step-3"
        onContinue={continueExisting}
        saving={!!adopting}
        draftSavedLabel={application ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}
