"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { Eyebrow } from "@/components/mira/Eyebrow";
import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";
import { SuggestionCard } from "@/components/mira/SuggestionCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassSuggestion, MentorApplication, MiraClass, Skill } from "@/types/mentor";

function AfterStep6Banner() {
  const searchParams = useSearchParams();
  if (searchParams.get("from") !== "step-6") return null;
  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-success/25 bg-success/[0.06] px-4 py-3 text-sm leading-relaxed text-charcoal"
    >
      Masterclass enregistrée. 
    </div>
  );
}

export default function Step4Page() {
  const router = useRouter();
  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [existingClasses, setExistingClasses] = useState<MiraClass[]>([]);
  const [suggestions, setSuggestions] = useState<ClassSuggestion[]>([]);
  const [skillsById, setSkillsById] = useState<Map<string, Skill>>(new Map());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [adopting, setAdopting] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
      apiClient.get<MiraClass[]>("/v1/mentors/applications/me/classes"),
      apiClient.get<ClassSuggestion[]>(
        "/v1/mentors/applications/me/class-suggestions?status=proposed",
      ),
      apiClient.get<Skill[]>("/v1/skills"),
    ])
      .then(([app, classes, sugg, skills]) => {
        if (!app) {
          router.replace("/mentors/apply/step-1");
          return;
        }
        if (!["draft", "submitted"].includes(app.status)) {
          router.replace("/me/application");
          return;
        }
        setApplication(app);
        setExistingClasses(
          classes.filter((c) => c.status === "draft" || c.status === "submitted"),
        );
        setSuggestions(sugg);
        setSkillsById(new Map(skills.map((s) => [s.id, s])));
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [router]);

  async function generate() {
    setGenerating(true);
    try {
      const rows = await apiClient.post<ClassSuggestion[]>(
        "/v1/mentors/applications/me/class-suggestions/generate",
        { count: 3 },
      );
      setSuggestions(rows);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Génération impossible.");
    } finally {
      setGenerating(false);
    }
  }

  async function adopt(id: string) {
    setAdopting(id);
    try {
      const mc = await apiClient.post<MiraClass>(
        `/v1/mentors/applications/me/class-suggestions/${id}/adopt`,
        {},
      );
      router.push(`/mentors/apply/step-5?class_id=${mc.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Adoption impossible.");
      setAdopting(null);
    }
  }

  async function reject(id: string, reason: string) {
    try {
      await apiClient.post(
        `/v1/mentors/applications/me/class-suggestions/${id}/reject`,
        { reason },
      );
      setSuggestions(suggestions.filter((s) => s.id !== id));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Rejet impossible.");
    }
  }

  async function createManual() {
    if (!manualTitle.trim()) return;
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
      toast.error(e instanceof ApiError ? e.message : "Création impossible.");
    }
  }

  async function removeClass(classId: string, title: string) {
    const ok = window.confirm(
      `Supprimer « ${title} » ? Tu pourras en créer une autre ensuite. Cette action est définitive pour cette proposition.`,
    );
    if (!ok) return;
    setDeletingId(classId);
    try {
      await apiClient.delete(`/v1/mentors/applications/me/classes/${classId}`);
      setExistingClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  function continueExisting() {
    if (existingClasses.length > 0) {
      // Hub : l’utilisateur a fini d’ajouter / ajuster ses classes → récap (étape 7)
      router.push("/mentors/apply/step-7");
    } else {
      toast.error("Adopte une suggestion ou crée ta propre Mira Class avant de continuer.");
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
      <Suspense fallback={null}>
        <AfterStep6Banner />
      </Suspense>

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

      {/* Classes déjà créées — après le bloc suggestions Mira AI */}
      {!loading && existingClasses.length > 0 && (
        <section className="mt-10">
          <Eyebrow className="mb-3">Tes masterclasses</Eyebrow>
          <div className="flex flex-col gap-3">
            {existingClasses.map((c) => (
              <MiraCard
                key={c.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal">{c.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {c.total_hours_collective}h coll. · {c.total_hours_individual}h indiv.
                    {c.format_envisaged ? ` · ${c.format_envisaged}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <MiraButton
                    variant="secondary"
                    size="sm"
                    leadingIcon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    onClick={() => router.push(`/mentors/apply/step-5?class_id=${c.id}`)}
                    disabled={!!deletingId}
                  >
                    Modifier
                  </MiraButton>
                  <MiraButton
                    variant="destructive"
                    size="sm"
                    leadingIcon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    onClick={() => void removeClass(c.id, c.title)}
                    disabled={deletingId === c.id || !!adopting}
                  >
                    {deletingId === c.id ? "Suppression…" : "Supprimer"}
                  </MiraButton>
                </div>
              </MiraCard>
            ))}
          </div>
        </section>
      )}

      <MiraCard className="mt-4">
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
        continueLabel={existingClasses.length > 0 ? "Aller au récapitulatif" : undefined}
        saving={!!adopting || !!deletingId}
        draftSavedLabel={application ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}
