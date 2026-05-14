"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { Eyebrow } from "@/components/mira/Eyebrow";
import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";
import { SmartNav } from "@/components/mira/SmartNav";
import { SectionTitle } from "@/components/mira/SectionTitle";
import { StatusBadge } from "@/components/mira/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, MentorApplication, MiraClass } from "@/types/mentor";

const STAGES: { id: ApplicationStatus; label: string; desc: string }[] = [
  { id: "submitted", label: "Candidature soumise", desc: "On a bien reçu — merci !" },
  { id: "in_review", label: "En examen", desc: "Un admin va relire ton dossier" },
  { id: "validated", label: "Validée", desc: "Ton profil est publié" },
];

function ProgressTrack({ status }: { status: ApplicationStatus }) {
  const idx = STAGES.findIndex((s) => s.id === status);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div
            key={s.id}
            className={cn(
              "rounded-xl border px-4 py-3",
              active ? "border-mira-red bg-mira-red/[0.04]" : "border-rule bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-success text-white",
                  active && "bg-mira-red text-white",
                  !done && !active && "border border-muted-soft text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className="text-[13.5px] font-semibold text-charcoal">
                {s.label}
              </span>
            </div>
            <p className="mt-1 pl-8 text-[12px] text-muted-foreground">{s.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  locked,
}: {
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-4 border-b border-rule py-3.5",
        locked ? "grid-cols-[150px_1fr_auto]" : "grid-cols-[150px_1fr]",
      )}
    >
      <span className="text-[12.5px] font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-charcoal">{value}</span>
      {locked ? (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground">
          <Lock className="h-3 w-3" strokeWidth={2} /> Verrouillé
        </span>
      ) : null}
    </div>
  );
}

export default function MyApplicationPage() {
  const [app, setApp] = useState<MentorApplication | null>(null);
  const [classes, setClasses] = useState<MiraClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<MentorApplication | null>("/v1/mentors/applications/me"),
      apiClient
        .get<MiraClass[]>("/v1/mentors/applications/me/classes")
        .catch(() => [] as MiraClass[]),
    ])
      .then(([a, c]) => {
        setApp(a);
        setClasses(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SmartNav />
        <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-8">
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-background">
        <SmartNav />
        <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-8">
          <MiraCard>
            <SectionTitle as="h1" size="page">Pas encore de candidature</SectionTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Lance-toi en 10 minutes avec Mira AI.
            </p>
            <Link href="/mentors/apply/step-1" className="mt-4 inline-block">
              <MiraButton>Démarrer ma candidature</MiraButton>
            </Link>
          </MiraCard>
        </div>
      </div>
    );
  }

  const isEditable = app.status === "draft" || app.status === "submitted";
  const fullName = `${app.first_name} ${app.last_name}`.trim() || "—";

  return (
    <div className="min-h-screen bg-background">
      <SmartNav />
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-8">
        {/* Success / status banner */}
        {app.status === "submitted" && (
          <div className="mb-7 flex items-center gap-4 rounded-2xl border border-success/20 bg-gradient-to-br from-success/[0.05] to-sage-soft/40 px-6 py-5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-success text-white">
              <Check className="h-5 w-5" strokeWidth={2.6} />
            </span>
            <div>
              <p className="font-serif text-lg font-medium text-charcoal">
                Candidature reçue.{" "}
                <span className="font-serif-italic">On revient vers toi sous 48 h.</span>
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Tu seras notifié·e par e-mail à chaque changement de statut.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-error/30 bg-error/[0.08] px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <SectionTitle as="h1" size="page">
            Ma candidature
          </SectionTitle>
          <StatusBadge status={app.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Suis l'avancement et édite ton dossier tant qu'il n'est pas en examen.
        </p>

        {app.status === "rejected" && app.decision_reason && (
          <MiraCard className="mt-6 border-error/30 bg-error/[0.04]">
            <Eyebrow>Décision admin</Eyebrow>
            <p className="mt-2 text-sm leading-relaxed text-charcoal">
              {app.decision_reason}
            </p>
          </MiraCard>
        )}

        {(app.status === "submitted" || app.status === "in_review" || app.status === "validated") && (
          <section className="mt-6">
            <Eyebrow className="mb-3">Avancement</Eyebrow>
            <ProgressTrack status={app.status} />
          </section>
        )}

        <MiraCard className="mt-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-charcoal">Ton dossier</h3>
            {isEditable ? (
              <Link
                href={app.status === "draft" ? "/mentors/apply/step-1" : "/mentors/apply/step-3"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-opacity hover:opacity-70",
                  "bg-success/[0.08] text-success",
                )}
              >
                ✎ Éditable
              </Link>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium",
                  "bg-warm-beige text-muted-foreground",
                )}
              >
                <Lock className="h-3 w-3" /> Verrouillé · en examen ou validé
              </span>
            )}
          </div>

          <Eyebrow className="mt-5 mb-1">
            Identité <span className="font-normal normal-case text-muted-foreground">· non modifiable</span>
          </Eyebrow>
          <SummaryRow label="Nom" value={fullName} locked={app.status !== 'draft'} />
          <SummaryRow
            label="Nomade depuis"
            value={app.nomad_since_year ? `${app.nomad_since_year}` : "—"}
            locked={app.status !== 'draft'}
          />

          <Eyebrow className="mt-6 mb-1">Profil</Eyebrow>
          <SummaryRow
            label="Bio courte"
            value={app.bio.slice(0, 120) || "—"}
          />
          <SummaryRow
            label="Transmission"
            value={app.transmission_pitch || "—"}
          />

          {classes.length > 0 && (
            <>
              <Eyebrow className="mt-6 mb-1">Masterclasses proposées</Eyebrow>
              {classes.map((c) => (
                <SummaryRow
                  key={c.id}
                  label={c.title.slice(0, 24)}
                  value={`${c.total_hours_collective}h coll. · ${c.format_envisaged} · ${c.status}`}
                />
              ))}
            </>
          )}
        </MiraCard>

        <MiraCard className="mt-6">
          <Eyebrow className="mb-3">La suite</Eyebrow>
          <ul className="space-y-2.5 text-sm leading-relaxed text-charcoal">
            <li className="flex gap-3">
              <span className="min-w-4 font-bold text-mira-red">1.</span>
              Un·e admin Mira relit ton dossier <strong>sous 48 h</strong> en moyenne.
            </li>
            <li className="flex gap-3">
              <span className="min-w-4 font-bold text-mira-red">2.</span>
              On peut t'envoyer un message pour clarifier un point. Tu seras notifié·e par mail.
            </li>
            <li className="flex gap-3">
              <span className="min-w-4 font-bold text-mira-red">3.</span>
              Si validé·e, ton profil et tes Mira Classes seront publiés sur l'annuaire.
            </li>
          </ul>
        </MiraCard>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/mentors">
            <MiraButton variant="ghost">Voir l'annuaire</MiraButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
