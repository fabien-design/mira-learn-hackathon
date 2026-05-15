import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import type { MentorProfilePublic } from "@/types/mentor";

import { MiraAvatar } from "./MiraAvatar";
import { SkillChip } from "./SkillChip";
import { Stars } from "./Stars";

interface MentorCardProps {
  mentor: MentorProfilePublic;
  primarySkills?: string[];
  location?: string;
}

export function MentorCard({ mentor, primarySkills = [], location }: MentorCardProps) {
  return (
    <Link
      href={`/mentors/${mentor.slug}`}
      className="flex flex-col gap-4 rounded-2xl border border-rule bg-card p-6 text-left transition-colors hover:border-muted-soft"
    >
      <div className="flex items-center gap-3.5">
        <MiraAvatar name={mentor.display_name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold tracking-tight">
            {mentor.display_name}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {mentor.headline || "Mira Mentor"}
          </div>
        </div>
      </div>

      <Stars
        rating={mentor.aggregate_rating}
        count={mentor.rating_count}
        classes={mentor.classes_given_count}
      />

      {primarySkills.length > 0 && (
        <div className="flex min-h-[26px] flex-wrap gap-1.5">
          {primarySkills.slice(0, 4).map((s, i) => (
            <SkillChip key={i} label={s} primary={i === 0} />
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-rule pt-4">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
          {location ?? "Worldwide"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mira-red">
          Voir le profil
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}
