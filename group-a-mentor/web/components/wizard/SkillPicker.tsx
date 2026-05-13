"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import type { Skill, SkillLevel } from "@/types/mentor";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickedSkill {
  skill_id: string;
  level: SkillLevel;
  validated_via_cv_import: boolean;
}

interface SkillPickerProps {
  catalogue: Skill[];
  value: PickedSkill[];
  onChange: (next: PickedSkill[]) => void;
}

const LEVELS: SkillLevel[] = ["intermediate", "advanced", "expert"];
const LEVEL_LABEL: Record<SkillLevel, string> = {
  intermediate: "intermédiaire",
  advanced: "avancé",
  expert: "expert",
};

export function SkillPicker({ catalogue, value, onChange }: SkillPickerProps) {
  const [search, setSearch] = useState("");

  const skillsById = useMemo(
    () => new Map(catalogue.map((s) => [s.id, s])),
    [catalogue],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalogue.slice(0, 12);
    return catalogue
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [search, catalogue]);

  function toggle(id: string) {
    const has = value.find((x) => x.skill_id === id);
    if (has) onChange(value.filter((x) => x.skill_id !== id));
    else
      onChange([
        ...value,
        { skill_id: id, level: "advanced", validated_via_cv_import: false },
      ]);
  }

  function setLevel(id: string, lvl: SkillLevel) {
    onChange(value.map((x) => (x.skill_id === id ? { ...x, level: lvl } : x)));
  }

  return (
    <div>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cherche une skill (pitch, design, react…)"
          className="h-11 rounded-xl border-rule bg-card pl-10 text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {filtered.map((s) => {
          const picked = value.find((x) => x.skill_id === s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                picked
                  ? "border-mira-red bg-mira-red text-white"
                  : "border-rule bg-card text-charcoal hover:border-muted-soft",
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tes skills sélectionnées — choisis ton niveau
          </p>
          <ul className="space-y-2">
            {value.map((s) => (
              <li
                key={s.skill_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-card px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-charcoal">
                    {skillsById.get(s.skill_id)?.name ?? s.skill_id}
                  </span>
                  {s.validated_via_cv_import && (
                    <span className="rounded-full bg-mira-red/[0.08] px-2 py-0.5 text-[11px] font-semibold text-mira-red">
                      ✨ CV
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(s.skill_id, lvl)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[12px] transition-colors",
                        s.level === lvl
                          ? "border-mira-red bg-mira-red text-white"
                          : "border-rule bg-background text-charcoal hover:border-muted-soft",
                      )}
                    >
                      {LEVEL_LABEL[lvl]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggle(s.skill_id)}
                    className="ml-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-error"
                  >
                    <X className="h-3 w-3" strokeWidth={2} /> Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
