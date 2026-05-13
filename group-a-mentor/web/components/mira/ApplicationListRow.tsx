import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import type { MentorApplication } from "@/types/mentor";

import { MiraAvatar } from "./MiraAvatar";
import { StatusBadge } from "./StatusBadge";

interface ApplicationListRowProps {
  application: MentorApplication;
  cvImported?: boolean;
  first?: boolean;
}

function relativeWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

export function ApplicationListRow({ application, cvImported, first }: ApplicationListRowProps) {
  const fullName = `${application.first_name} ${application.last_name}`.trim() || "Candidat·e";
  return (
    <Link
      href={`/admin/applications/${application.id}`}
      className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-warm-beige ${
        first ? "" : "border-t border-rule"
      }`}
    >
      <MiraAvatar name={fullName} size={42} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-semibold text-charcoal">{fullName}</span>
          <StatusBadge status={application.status} />
          {cvImported && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mira-red/[0.08] px-2 py-0.5 text-[11px] font-semibold text-mira-red">
              <Sparkles className="h-3 w-3" strokeWidth={2} /> CV importé
            </span>
          )}
        </div>
        <div className="mt-1 truncate text-[13.5px] text-muted-foreground">
          {application.transmission_pitch || "Pas de pitch renseigné."}
        </div>
      </div>
      <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
        {relativeWhen(application.submitted_at ?? application.created_at)}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
    </Link>
  );
}
