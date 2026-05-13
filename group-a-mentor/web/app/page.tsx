"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Eyebrow } from "@/components/mira/Eyebrow";
import { Footer } from "@/components/mira/Footer";
import { MiraButton } from "@/components/mira/MiraButton";
import { SmartNav } from "@/components/mira/SmartNav";
import { useAuth } from "@/hooks/useAuth";
import { useApplication } from "@/lib/wizard-state";
import type { ApplicationStatus } from "@/types/mentor";

const BLOCKED_APPLICATION_STATUSES: ApplicationStatus[] = [
  "draft",
  "submitted",
  "in_review",
  "validated",
];

export default function HomePage() {
  const { user } = useAuth();
  const { application, loading: appLoading } = useApplication();

  const showDevenirMentorCta =
    !user ||
    (Boolean(user) &&
      !appLoading &&
      (!application ||
        application.status === "rejected" ||
        !BLOCKED_APPLICATION_STATUSES.includes(application.status)));

  return (
    <div className="min-h-screen bg-background">
      <SmartNav />
      <main className="mx-auto w-full max-w-[1320px] px-6 pb-24 pt-24 md:px-8">
        <div className="max-w-3xl">
          <Eyebrow>Mira Learn · pour les digital nomads francophones</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(2.75rem,6vw,4.5rem)] font-medium leading-[1.05] tracking-tight text-charcoal">
            Transmets ton savoir, <span className="font-serif-italic">finance tes voyages.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            Mira Learn rassemble les digital nomads qui ont une expertise concrète et veulent
            la transmettre en petit groupe. Mira AI t'aide à structurer ta première
            masterclass en moins de 15 minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {showDevenirMentorCta && (
              <Link href="/mentors/apply/step-1">
                <MiraButton trailingIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}>
                  Devenir mentor
                </MiraButton>
              </Link>
            )}
            <Link href="/mentors">
              <MiraButton variant="secondary">Voir les mentors</MiraButton>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
