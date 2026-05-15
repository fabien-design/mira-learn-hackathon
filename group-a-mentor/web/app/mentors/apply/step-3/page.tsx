"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ExperienceEditor } from "@/components/wizard/ExperienceEditor";
import { FieldRow } from "@/components/wizard/FieldRow";
import { PickedSkill, SkillPicker } from "@/components/wizard/SkillPicker";
import { CvIngestionPanel } from "@/components/mira/CvIngestionPanel";
import { MiraButton } from "@/components/mira/MiraButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApplicationSkill,
  CVImport,
  MentorApplication,
  ProfessionalExperience,
  Skill,
  SkillLevel,
} from "@/types/mentor";

interface FormState {
  bio: string;
  transmission_pitch: string;
  motivation: string;
  linkedin_url: string;
  instagram_url: string;
  website_url: string;
  journey: ProfessionalExperience[];
  skills: PickedSkill[];
}

const EMPTY: FormState = {
  bio: "",
  transmission_pitch: "",
  motivation: "",
  linkedin_url: "",
  instagram_url: "",
  website_url: "",
  journey: [],
  skills: [],
};

export default function Step3Page() {
  return (
    <Suspense
      fallback={
        <WizardShell currentStep={3}>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </WizardShell>
      }
    >
      <Step3Inner />
    </Suspense>
  );
}

function Step3Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const cvImportId = params.get("cv_import_id");

  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [skillsCatalogue, setSkillsCatalogue] = useState<Skill[]>([]);
  const [cv, setCv] = useState<CVImport | null>(null);
  const [cvBusy, setCvBusy] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
      apiClient.get<Skill[]>("/v1/skills"),
      apiClient.get<ApplicationSkill[]>("/v1/mentors/applications/me/skills"),
    ])
      .then(([app, skills, mySkills]) => {
        if (!app) {
          router.replace("/mentors/apply/step-1");
          return;
        }
        if (!["draft", "submitted"].includes(app.status)) {
          router.replace("/me/application");
          return;
        }
        setApplication(app);
        setSkillsCatalogue(skills);
        setForm({
          bio: app.bio ?? "",
          transmission_pitch: app.transmission_pitch ?? "",
          motivation: app.motivation ?? "",
          linkedin_url: app.linkedin_url ?? "",
          instagram_url: app.instagram_url ?? "",
          website_url: app.website_url ?? "",
          journey: app.professional_journey ?? [],
          skills: (mySkills ?? []).map((s) => ({
            skill_id: s.skill_id,
            level: s.level,
            is_primary: s.is_primary,
            validated_via_cv_import: s.validated_via_cv_import,
          })),
        });
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : "Erreur réseau."));
  }, [router]);

  useEffect(() => {
    if (!cvImportId) return;
    let cancelled = false;
    setCvBusy(true);

    const POLL_INTERVAL_MS = 2500;
    const MAX_POLL_MS = 5 * 60 * 1000;

    (async () => {
      try {
        let current = await apiClient.get<CVImport>(
          `/v1/mentors/applications/me/cv-imports/${cvImportId}`,
        );
        // Kick off extraction asynchronously if not started yet
        if (current.status === "uploaded" || current.status === "failed") {
          if (cancelled) return;
          try {
            current = await apiClient.post<CVImport>(
              `/v1/mentors/applications/me/cv-imports/${cvImportId}/extract`,
            );
          } catch (e) {
            if (!cancelled) {
              toast.error(e instanceof ApiError ? e.message : "Extraction CV échouée.");
              setCv(current);
              setCvBusy(false);
            }
            return;
          }
        }
        if (!cancelled) setCv(current);

        // Poll until terminal status
        const started = Date.now();
        while (!cancelled && current.status === "extracting") {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          if (cancelled) return;
          if (Date.now() - started > MAX_POLL_MS) {
            toast.error("Extraction trop longue — réessaie plus tard.");
            break;
          }
          try {
            current = await apiClient.get<CVImport>(
              `/v1/mentors/applications/me/cv-imports/${cvImportId}`,
            );
            if (!cancelled) setCv(current);
          } catch (e) {
            if (!cancelled) {
              toast.error(e instanceof ApiError ? e.message : "Polling CV échoué.");
            }
            break;
          }
        }
      } finally {
        if (!cancelled) setCvBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cvImportId]);

  async function confirmCvValidation() {
    if (!cv || !cvImportId) return;
    try {
      // Send ALL extracted skills — backend creates unknown ones automatically
      await apiClient.patch(
        `/v1/mentors/applications/me/cv-imports/${cvImportId}/validate`,
        {
          validated_experiences: cv.extracted_experiences_raw ?? [],
          validated_skills: cv.extracted_skills_raw ?? [],
        },
      );
      // Re-fetch application (bio/social prefilled by backend) + catalogue + skills
      const [updatedApp, updatedCatalogue, mySkills] = await Promise.all([
        apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
        apiClient.get<Skill[]>("/v1/skills"),
        apiClient.get<ApplicationSkill[]>("/v1/mentors/applications/me/skills"),
      ]);
      setApplication(updatedApp);
      setSkillsCatalogue(updatedCatalogue);
      setForm((f) => ({
        ...f,
        bio: updatedApp?.bio || f.bio,
        linkedin_url: updatedApp?.linkedin_url || f.linkedin_url,
        instagram_url: updatedApp?.instagram_url || f.instagram_url,
        website_url: updatedApp?.website_url || f.website_url,
        journey:
          (cv.extracted_experiences_raw ?? []).length > 0
            ? cv.extracted_experiences_raw!
            : f.journey,
        skills: (mySkills ?? []).map((s) => ({
          skill_id: s.skill_id,
          level: s.level as SkillLevel,
          is_primary: s.is_primary,
          validated_via_cv_import: s.validated_via_cv_import,
        })),
      }));
      router.replace("/mentors/apply/step-3");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Validation CV échouée.");
    }
  }

  const canContinue =
    form.bio.trim().length > 0 &&
    form.transmission_pitch.trim().length > 0 &&
    form.skills.length > 0;

  async function handleContinue() {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      await apiClient.patch("/v1/mentors/applications/me/profile", {
        bio: form.bio,
        professional_journey: form.journey,
        transmission_pitch: form.transmission_pitch,
        motivation: form.motivation,
        linkedin_url: form.linkedin_url || null,
        instagram_url: form.instagram_url || null,
        website_url: form.website_url || null,
      });
      await apiClient.put("/v1/mentors/applications/me/skills", {
        skills: form.skills.map((s) => ({
          skill_id: s.skill_id,
          level: s.level,
          is_primary: s.is_primary,
          self_declared: !s.validated_via_cv_import,
          validated_via_cv_import: s.validated_via_cv_import,
        })),
      });
      router.push("/mentors/apply/step-4");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Sauvegarde impossible.");
      setSaving(false);
    }
  }

  return (
    <WizardShell currentStep={3}>
      <WizardStepHeader
        eyebrow="Étape 3 · Profil pro"
        title={
          <>
            Raconte-nous <span className="font-serif-italic">qui tu es.</span>
          </>
        }
      />
      {cvImportId && (
        <CvIngestionPanel
          cv={cv}
          busy={cvBusy}
          onConfirm={confirmCvValidation}
          onDiscard={() => router.replace("/mentors/apply/step-3")}
        />
      )}

      <section className="mt-8 space-y-5">
        <FieldRow label="Bio courte">
          <Textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="3-5 lignes — ton parcours, ce qui te motive, ton style."
            className="min-h-24 rounded-xl border-rule bg-card p-4 text-sm focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <FieldRow label="Que veux-tu transmettre ?">
          <Textarea
            value={form.transmission_pitch}
            onChange={(e) => setForm({ ...form, transmission_pitch: e.target.value })}
            placeholder="Le sujet, le pourquoi, à qui tu t'adresses."
            className="min-h-20 rounded-xl border-rule bg-card p-4 text-sm focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <FieldRow label="Pourquoi devenir Mira Mentor ? (optionnel)">
          <Textarea
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            placeholder="Tu peux laisser vide si tu ne sais pas encore."
            className="min-h-20 rounded-xl border-rule bg-card p-4 text-sm focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldRow label="LinkedIn URL">
            <Input
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/…"
              className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
            />
          </FieldRow>
          <FieldRow label="Instagram URL">
            <Input
              value={form.instagram_url}
              onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
              placeholder="https://instagram.com/…"
              className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
            />
          </FieldRow>
          <FieldRow label="Site web">
            <Input
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              placeholder="https://…"
              className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
            />
          </FieldRow>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-charcoal">Parcours professionnel</h3>
          <MiraButton
            variant="secondary"
            size="sm"
            onClick={() =>
              setForm({
                ...form,
                journey: [
                  ...form.journey,
                  {
                    role: "",
                    company: "",
                    start_year: new Date().getFullYear(),
                    end_year: null,
                    description: "",
                  },
                ],
              })
            }
          >
            + Ajouter
          </MiraButton>
        </div>
        <div className="space-y-3">
          {form.journey.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ajoute tes expériences clés — 3 à 5 suffisent.
            </p>
          )}
          {form.journey.map((exp, idx) => (
            <ExperienceEditor
              key={idx}
              value={exp}
              onChange={(next) =>
                setForm({
                  ...form,
                  journey: form.journey.map((e, i) => (i === idx ? next : e)),
                })
              }
              onRemove={() =>
                setForm({
                  ...form,
                  journey: form.journey.filter((_, i) => i !== idx),
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-lg font-semibold text-charcoal">Tes skills</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionne au moins 3 skills sur lesquelles tu te sens à l'aise pour mentor.
        </p>
        <div className="mt-3">
          <SkillPicker
            catalogue={skillsCatalogue}
            value={form.skills}
            onChange={(skills) => setForm({ ...form, skills })}
            onSkillCreated={(skill) =>
              setSkillsCatalogue((prev) => [...prev, skill])
            }
            createSkill={async (name) => {
              const skill = await apiClient.post<Skill>("/v1/skills", {
                name,
                category: "soft",
              });
              return skill;
            }}
          />
        </div>
      </section>

      <WizardFooter
        prevHref="/mentors/apply/step-2"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        saving={saving}
        draftSavedLabel={application ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}

