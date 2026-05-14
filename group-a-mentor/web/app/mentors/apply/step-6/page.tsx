"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ErrorBanner } from "@/components/wizard/ErrorBanner";
import { FieldRow } from "@/components/wizard/FieldRow";
import { MiraCard } from "@/components/mira/MiraCard";
import { Stat } from "@/components/mira/Stat";
import { Input } from "@/components/ui/input";
import type { MentorApplication, MiraClass, RevenueSimulationResult } from "@/types/mentor";

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export default function Step6Page() {
  return (
    <Suspense
      fallback={
        <WizardShell currentStep={6}>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </WizardShell>
      }
    >
      <Step6Inner />
    </Suspense>
  );
}

function Step6Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get("class_id");

  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [mc, setMc] = useState<MiraClass | null>(null);
  const [rateCollective, setRateCollective] = useState(80);
  const [rateIndividual, setRateIndividual] = useState(120);
  const [capacity, setCapacity] = useState(6);
  const [sim, setSim] = useState<RevenueSimulationResult | null>(null);
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
        setMc(cls);
        if (cls.recommended_price_per_hour_collective_cents) {
          setRateCollective(Math.round(cls.recommended_price_per_hour_collective_cents / 100));
        }
        if (cls.recommended_price_per_hour_individual_cents) {
          setRateIndividual(Math.round(cls.recommended_price_per_hour_individual_cents / 100));
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."));
  }, [classId, router]);

  useEffect(() => {
    if (!mc) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const result = await apiClient.post<RevenueSimulationResult>(
          "/v1/mentors/revenue-simulation",
          {
            hours_collective: mc.total_hours_collective * Math.max(1, capacity),
            hours_individual: mc.total_hours_individual,
            rate_collective_cents: rateCollective * 100,
            rate_individual_cents: rateIndividual * 100,
          },
        );
        if (!ctrl.signal.aborted) setSim(result);
      } catch {
        // non-blocking
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [mc, rateCollective, rateIndividual, capacity]);

  async function handleContinue() {
    if (!classId || !mc) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/v1/mentors/applications/me/classes/${classId}`, {
        recommended_price_per_hour_collective_cents: rateCollective * 100,
        recommended_price_per_hour_individual_cents: rateIndividual * 100,
      });
      router.push("/mentors/apply/step-4?from=step-6");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sauvegarde impossible.");
      setSaving(false);
    }
  }

  const hint = mc
    ? `${mc.total_hours_collective}h collective + ${mc.total_hours_individual}h individuelle`
    : null;

  return (
    <WizardShell currentStep={6}>
      <WizardStepHeader
        eyebrow="Étape 6 · Simulation revenu"
        title={
          <>
            Combien ça <span className="font-serif-italic">peut te rapporter ?</span>
          </>
        }
        subtitle={hint ?? undefined}
      />
      <ErrorBanner message={error} />

      <section className="grid gap-5 md:grid-cols-3">
        <FieldRow label="€ / heure collective">
          <Input
            type="number"
            min={0}
            value={rateCollective}
            onChange={(e) => setRateCollective(Number(e.target.value) || 0)}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <FieldRow label="€ / heure individuelle">
          <Input
            type="number"
            min={0}
            value={rateIndividual}
            onChange={(e) => setRateIndividual(Number(e.target.value) || 0)}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
        <FieldRow label="Capacité (apprenants / session)">
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))}
            className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </FieldRow>
      </section>

      <MiraCard className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Simulation
        </p>
        {sim ? (
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <Stat label="Revenu brut" value={formatEuro(sim.gross_revenue_cents)} />
            <Stat
              label={`Frais plateforme (${Math.round(sim.platform_fee_pct * 100)}%)`}
              value={formatEuro(sim.platform_fee_cents)}
              variant="muted"
            />
            <Stat
              label="Net pour toi"
              value={formatEuro(sim.mentor_net_cents)}
              variant="accent"
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Calcul en cours…</p>
        )}
        <p className="mt-4 text-[12px] text-muted-foreground">
          25 % de marge plateforme Hello Mira. Estimation indicative, non contractuelle.
        </p>
      </MiraCard>

      <WizardFooter
        prevHref={`/mentors/apply/step-5?class_id=${classId ?? ""}`}
        onContinue={handleContinue}
        saving={saving}
        draftSavedLabel={application ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}
