"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ApiError, apiClient } from "@/lib/api-client";
import { DecisionBlock } from "@/components/mira/DecisionBlock";
import { Eyebrow } from "@/components/mira/Eyebrow";
import { JourneyTimeline } from "@/components/mira/JourneyTimeline";
import { MiraAvatar } from "@/components/mira/MiraAvatar";
import { MiraCard } from "@/components/mira/MiraCard";
import { ProposedClassCard } from "@/components/mira/ProposedClassCard";
import { SectionTitle } from "@/components/mira/SectionTitle";
import { SkillChip } from "@/components/mira/SkillChip";
import { StatusBadge } from "@/components/mira/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ApplicationSkill,
  MentorApplication,
  MiraClass,
  Skill,
} from "@/types/mentor";

type ClassDecision = {
  class_id: string;
  decision: "validated_draft" | "rejected";
  rejection_reason?: string;
};

export default function AdminApplicationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [app, setApp] = useState<MentorApplication | null>(null);
  const [classes, setClasses] = useState<MiraClass[]>([]);
  const [skills, setSkills] = useState<ApplicationSkill[]>([]);
  const [skillsCatalogue, setSkillsCatalogue] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [classDecisions, setClassDecisions] = useState<Map<string, ClassDecision>>(
    new Map(),
  );
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiClient.get<MentorApplication>(`/v1/admin/mentors/applications/${id}`),
      apiClient.get<MiraClass[]>(`/v1/admin/mentors/applications/${id}/classes`),
      apiClient
        .get<ApplicationSkill[]>(`/v1/admin/mentors/applications/${id}/skills`)
        .catch(() => [] as ApplicationSkill[]),
      apiClient.get<Skill[]>("/v1/skills"),
    ])
      .then(([a, c, s, sk]) => {
        setApp(a);
        setClasses(c);
        setSkills(s);
        setSkillsCatalogue(sk);
        const defaults = new Map<string, ClassDecision>();
        for (const cls of c) {
          defaults.set(cls.id, { class_id: cls.id, decision: "validated_draft" });
        }
        setClassDecisions(defaults);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [id]);

  function setDecision(classId: string, patch: Partial<ClassDecision>) {
    setClassDecisions((prev) => {
      const next = new Map(prev);
      const current = next.get(classId) ?? { class_id: classId, decision: "validated_draft" };
      next.set(classId, { ...current, ...patch });
      return next;
    });
  }

  async function decide(decision: "validated" | "rejected" | "in_review") {
    if (!id) return;
    setSubmitting(decision);
    setError(null);
    const body: Record<string, unknown> = {
      decision,
      decision_reason: decisionReason || null,
    };
    if (decision === "validated") {
      body.class_decisions = Array.from(classDecisions.values());
    }
    try {
      await apiClient.post(`/v1/admin/mentors/applications/${id}/review`, body);
      router.push("/admin/applications");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Décision impossible.");
      setSubmitting(null);
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!app) {
    return (
      <MiraCard>
        <p className="text-sm text-muted-foreground">Candidature introuvable.</p>
      </MiraCard>
    );
  }

  const fullName = `${app.first_name} ${app.last_name}`.trim() || "—";
  const firstName = app.first_name || "le candidat";
  const skillsById = new Map(skillsCatalogue.map((s) => [s.id, s]));
  const decisionable = app.status === "submitted" || app.status === "in_review";

  return (
    <div className="space-y-7">
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-charcoal"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Toutes les candidatures
      </Link>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/[0.08] px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex items-center gap-5">
        <MiraAvatar name={fullName} size={72} />
        <div className="min-w-0 flex-1">
          <SectionTitle as="h1" size="page">{fullName}</SectionTitle>
          <p className="mt-1 text-base text-charcoal">
            {app.transmission_pitch || "—"}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Candidature reçue {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("fr-FR") : "—"}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <section>
        <Eyebrow className="mb-2">Bio longue</Eyebrow>
        <p className="max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal">
          {app.bio || "—"}
        </p>
      </section>

      <section>
        <Eyebrow className="mb-2">Skills proposées ({skills.length})</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune skill renseignée.</p>
          ) : (
            skills.map((s, i) => (
              <SkillChip
                key={s.id}
                primary={i < 3}
                label={`${skillsById.get(s.skill_id)?.name ?? s.skill_id} · ${s.level}`}
                validated={s.validated_via_cv_import}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <Eyebrow>
            Masterclasses proposées ({classes.length})
          </Eyebrow>
        </div>
        <div className="space-y-3">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune masterclass.</p>
          ) : (
            classes.map((c) => (
              <ProposedClassCard
                key={c.id}
                mc={c}
                decision={classDecisions.get(c.id)?.decision}
                rejectionReason={classDecisions.get(c.id)?.rejection_reason}
                onSetDecision={
                  decisionable
                    ? (d) => setDecision(c.id, { decision: d })
                    : undefined
                }
                onSetReason={
                  decisionable
                    ? (r) => setDecision(c.id, { rejection_reason: r })
                    : undefined
                }
              />
            ))
          )}
        </div>
      </section>

      {app.professional_journey.length > 0 && (
        <section>
          <Eyebrow className="mb-3">Parcours</Eyebrow>
          <JourneyTimeline items={app.professional_journey} />
        </section>
      )}

      {app.motivation && (
        <section>
          <Eyebrow className="mb-2">Motivation</Eyebrow>
          <blockquote className="max-w-3xl rounded-r-xl border-l-[3px] border-mira-red bg-mira-red/[0.04] py-3.5 pl-5 pr-4 font-serif text-[17px] italic leading-relaxed text-charcoal">
            "{app.motivation}"
          </blockquote>
        </section>
      )}

      {decisionable && (
        <DecisionBlock
          candidateFirstName={firstName}
          comment={decisionReason}
          onCommentChange={setDecisionReason}
          submitting={submitting}
          alreadyInReview={app.status === "in_review"}
          onValidate={() => decide("validated")}
          onReject={() => decide("rejected")}
          onInReview={() => decide("in_review")}
        />
      )}
    </div>
  );
}
