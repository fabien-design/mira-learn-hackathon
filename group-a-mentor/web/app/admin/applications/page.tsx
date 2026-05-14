"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { ApplicationListRow } from "@/components/mira/ApplicationListRow";
import { EmptyState } from "@/components/mira/EmptyState";
import { MiraCard } from "@/components/mira/MiraCard";
import { SectionTitle } from "@/components/mira/SectionTitle";
import { Tabs } from "@/components/mira/Tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationStatus, MentorApplication } from "@/types/mentor";

type TabId = ApplicationStatus | "all";

const TAB_OPTIONS: { value: TabId; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "validated", label: "Validated" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminApplicationsListPage() {
  const [items, setItems] = useState<MentorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("submitted");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    const path =
      tab === "all"
        ? "/v1/admin/mentors/applications"
        : `/v1/admin/mentors/applications?status=${tab}`;
    apiClient
      .get<MentorApplication[]>(path)
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [tab]);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = {
      all: items.length,
      draft: 0,
      submitted: 0,
      in_review: 0,
      validated: 0,
      rejected: 0,
    };
    for (const a of items) c[a.status]++;
    if (tab !== "all") c[tab] = items.length;
    return c;
  }, [items, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => `${a.first_name} ${a.last_name}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <SectionTitle as="h1" size="page">
          Candidatures mentors
        </SectionTitle>
        <span className="text-sm font-medium text-muted-foreground">
          {counts.all} au total
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Modère les nouvelles candidatures sous 48 h. L'IA pré-extrait les skills depuis les
        CV.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="overflow-x-auto pb-0.5">
          <Tabs
            value={tab}
            options={TAB_OPTIONS.map((t) => ({
              ...t,
              count: tab === t.value ? counts[t.value] : undefined,
            }))}
            onChange={(v) => setTab(v)}
          />
        </div>
        <div className="relative w-full sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un candidat…"
            className="h-10 w-full rounded-xl border-rule bg-card pl-9 text-sm focus-visible:border-mira-red focus-visible:ring-mira-red/15"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/8 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune candidature pour l'instant."
          description="Calme avant la tempête."
        />
      ) : (
        <MiraCard padded={false} className="overflow-hidden">
          {filtered.map((a, i) => (
            <ApplicationListRow key={a.id} application={a} first={i === 0} />
          ))}
        </MiraCard>
      )}
    </div>
  );
}
