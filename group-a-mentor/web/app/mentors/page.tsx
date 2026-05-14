"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowDownWideNarrow, Plus, Minus } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { EmptyState } from "@/components/mira/EmptyState";
import { Eyebrow } from "@/components/mira/Eyebrow";
import { FilterChip } from "@/components/mira/FilterChip";
import { Footer } from "@/components/mira/Footer";
import { MentorCard } from "@/components/mira/MentorCard";
import { MiraButton } from "@/components/mira/MiraButton";
import { SmartNav } from "@/components/mira/SmartNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { MentorProfilePublic, Skill } from "@/types/mentor";

const SORTS = [
  { value: "rating", label: "Rating ↓" },
  { value: "classes_count", label: "Classes ↓" },
  { value: "alphabetical", label: "Alphabétique" },
];

export default function MentorsDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Chargement…</div>}>
      <DirectoryInner />
    </Suspense>
  );
}

function DirectoryInner() {
  const router = useRouter();
  const params = useSearchParams();
  const skillFilter = params.get("skill_id") ?? "";
  const sort = params.get("sort") ?? "rating";

  const [mentors, setMentors] = useState<MentorProfilePublic[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (skillFilter) qs.set("skill_id", skillFilter);
    if (sort) qs.set("sort", sort);
    Promise.all([
      apiClient.get<MentorProfilePublic[]>(`/v1/mentors?${qs.toString()}`),
      apiClient.get<Skill[]>("/v1/skills"),
    ])
      .then(([m, s]) => {
        setMentors(m);
        setSkills(s);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [skillFilter, sort]);

  function updateQuery(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`/mentors${next.toString() ? `?${next.toString()}` : ""}`);
  }

  const popularSkills = useMemo(
    () =>
      skills.slice().sort((a, b) => b.popularity_score - a.popularity_score).slice(0, 6),
    [skills],
  );

  return (
    <div className="min-h-screen bg-background">
      <SmartNav />

      {/* Hero */}
      <section className="pb-14 pt-20">
        <div className="mx-auto w-full max-w-[1320px] px-6 md:px-8">
          <div className="max-w-[820px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Mira Mentors · Rejoins les {mentors.length} mentors validés
            </p>
            <h1 className="mt-4 font-serif text-[clamp(2.5rem,5.5vw,4rem)] font-medium leading-[1.05] tracking-tight text-charcoal">
              Rejoins la communauté des Mira Mentors et{" "}
              <span className="font-serif-italic">finance tes voyages grâce à ton expérience.</span>
            </h1>
            <p className="mt-5 max-w-[620px] text-[18px] leading-relaxed text-muted-foreground">
              Transmets ce que tu sais faire à d'autres nomades, en petit groupe, depuis là
              où tu es. Mira AI t'aide à structurer ta première masterclass en quelques
              minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/mentors/apply/step-1">
                <MiraButton
                  trailingIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  Candidater comme mentor
                </MiraButton>
              </Link>
              <a
                href="#mentors-list"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal hover:underline"
              >
                Découvrir les mentors actuels
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section>
        <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-4 px-6 pb-7 md:px-8">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!skillFilter}
              onClick={() => updateQuery({ skill_id: null })}
            >
              Tout
            </FilterChip>
            {(showAllSkills ? skills.slice().sort((a, b) => b.popularity_score - a.popularity_score) : popularSkills).map((s) => (
              <FilterChip
                key={s.id}
                active={skillFilter === s.id}
                onClick={() => updateQuery({ skill_id: s.id })}
              >
                {s.name}
              </FilterChip>
            ))}
            {!showAllSkills && skills.length > popularSkills.length && (
              <FilterChip
                onClick={() => setShowAllSkills(true)}
                className="gap-1"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
                {skills.length - popularSkills.length}
              </FilterChip>
            )}
            {showAllSkills && (
              <FilterChip
                onClick={() => setShowAllSkills(false)}
                className="gap-1"
              >
                <Minus className="h-3 w-3" strokeWidth={2.5} />
                Moins
              </FilterChip>
            )}
          </div>
          <div className="ml-auto inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <ArrowDownWideNarrow className="w-4" />
            <Select value={sort} onValueChange={(v) => updateQuery({ sort: v })}>
              <SelectTrigger className="h-9 rounded-lg border-rule bg-card text-[13px] font-medium text-charcoal focus:border-mira-red focus:ring-mira-red/15">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section id="mentors-list" className="pb-28">
        <div className="mx-auto w-full max-w-[1320px] px-6 md:px-8">
          <Eyebrow className="mb-6">Ils sont déjà mentors</Eyebrow>
          {error && (
            <div className="mb-6 rounded-xl border border-error/30 bg-error/8 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
              <Skeleton className="h-60 rounded-2xl" />
              <Skeleton className="h-60 rounded-2xl" />
              <Skeleton className="h-60 rounded-2xl" />
            </div>
          ) : mentors.length === 0 ? (
            <EmptyState
              title="Aucun mentor pour ce filtre."
              description="Essaie une autre skill ou réinitialise les filtres."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
              {mentors.map((m) => (
                <MentorCard key={m.id} mentor={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
