"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Link2, MapPin } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { Eyebrow } from "@/components/mira/Eyebrow";
import { Footer } from "@/components/mira/Footer";
import { JourneyTimeline } from "@/components/mira/JourneyTimeline";
import { MiraAvatar } from "@/components/mira/MiraAvatar";
import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";
import { PublicNav } from "@/components/mira/PublicNav";
import { SectionTitle } from "@/components/mira/SectionTitle";
import { Stars } from "@/components/mira/Stars";
import { Skeleton } from "@/components/ui/skeleton";
import type { MentorProfilePublic, MiraClass } from "@/types/mentor";

export default function MentorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [mentor, setMentor] = useState<MentorProfilePublic | null>(null);
  const [classes, setClasses] = useState<MiraClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      apiClient.get<MentorProfilePublic>(`/v1/mentors/${slug}`),
      apiClient
        .get<MiraClass[]>(`/v1/mentors/${slug}/classes`)
        .catch(() => [] as MiraClass[]),
    ])
      .then(([m, c]) => {
        setMentor(m);
        setClasses(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <div className="mx-auto w-full max-w-[1320px] px-6 md:px-8 pt-7">
        <Link
          href="/mentors"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-charcoal"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Retour à l'annuaire
        </Link>
      </div>

      <main className="mx-auto w-full max-w-[1320px] px-6 md:px-8 pb-24 pt-8">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="mt-6 h-64 rounded-2xl" />
          </>
        ) : error ? (
          <MiraCard>
            <p className="text-sm text-error">{error}</p>
          </MiraCard>
        ) : !mentor ? (
          <MiraCard>
            <p className="text-sm text-muted-foreground">Mentor introuvable.</p>
          </MiraCard>
        ) : (
          <>
            <section className="grid items-center gap-8 pb-10 md:grid-cols-[auto_1fr_auto]">
              <MiraAvatar name={mentor.display_name} size={120} ring />
              <div>
                <Eyebrow tone="accent">Mira Mentor</Eyebrow>
                <SectionTitle as="h1" size="hero" className="mt-2">
                  {mentor.display_name}
                </SectionTitle>
                <p className="mt-2 text-[18px] text-charcoal">{mentor.headline}</p>
                <div className="mt-3 inline-flex items-center gap-4 text-[13px] text-muted-foreground">
                  <Stars
                    rating={mentor.aggregate_rating ? Number(mentor.aggregate_rating) : null}
                    count={mentor.rating_count}
                    classes={mentor.classes_given_count}
                  />
                  <span className="h-0.5 w-0.5 rounded-full bg-muted-soft" aria-hidden />
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Worldwide
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 self-stretch justify-center">
                {mentor.linkedin_url && (
                  <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <MiraButton
                      variant="secondary"
                      size="sm"
                      className="w-52"
                      leadingIcon={<Link2 className="h-4 w-4" strokeWidth={1.8} />}
                    >
                      LinkedIn
                    </MiraButton>
                  </a>
                )}
                {mentor.website_url && (
                  <a href={mentor.website_url} target="_blank" rel="noopener noreferrer">
                    <MiraButton
                      variant="secondary"
                      size="sm"
                      className="w-52"
                      leadingIcon={<ExternalLink className="h-4 w-4" strokeWidth={1.8} />}
                    >
                      Site
                    </MiraButton>
                  </a>
                )}
              </div>
            </section>

            <section className="grid items-start gap-10 md:grid-cols-[1fr_360px]">
              {/* LEFT */}
              <div className="flex flex-col gap-10">
                <div>
                  <SectionTitle as="h3" className="mb-4">À propos</SectionTitle>
                  <p className="whitespace-pre-wrap text-[15.5px] leading-7 text-charcoal">
                    {mentor.bio || "—"}
                  </p>
                </div>
                {mentor.professional_journey?.length > 0 && (
                  <div>
                    <SectionTitle as="h3" className="mb-5">Parcours</SectionTitle>
                    <JourneyTimeline items={mentor.professional_journey} />
                  </div>
                )}
              </div>

              {/* RIGHT — classes sticky */}
              <aside className="md:sticky md:top-24">
                <Eyebrow className="mb-3">Classes proposées</Eyebrow>
                {classes.length === 0 ? (
                  <MiraCard>
                    <p className="text-sm text-muted-foreground">
                      Pas encore de Mira Class publiée.
                    </p>
                  </MiraCard>
                ) : (
                  <div className="flex flex-col gap-3">
                    {classes.slice(0, 3).map((c) => (
                      <MiraCard key={c.id} padded={false} className="p-5">
                        <h4 className="font-serif text-[19px] font-medium tracking-tight text-charcoal">
                          {c.title}
                        </h4>
                        {c.description && (
                          <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                          <ParamRow label="Durée" value={`${c.total_hours} h`} />
                          <ParamRow label="Format" value={c.format_envisaged} />
                        </div>
                        <MiraButton
                          className="mt-4 w-full"
                          trailingIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
                        >
                          Découvrir
                        </MiraButton>
                      </MiraCard>
                    ))}
                  </div>
                )}
              </aside>
            </section>

            <MiraCard className="mt-14">
              <p className="font-serif text-lg font-medium text-charcoal">
                Toi aussi tu veux mentorer ?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lance ta candidature en 10 min avec Mira AI.
              </p>
              <Link href="/mentors/apply/step-1" className="mt-3 inline-block">
                <MiraButton trailingIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}>
                  Candidater comme mentor
                </MiraButton>
              </Link>
            </MiraCard>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-charcoal">{value}</div>
    </div>
  );
}
