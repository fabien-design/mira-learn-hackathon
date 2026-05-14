"use client";

import { useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";

import type { Skill, SkillLevel } from "@/types/mentor";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickedSkill {
  skill_id: string;
  level: SkillLevel;
  is_primary: boolean;
  validated_via_cv_import: boolean;
}

interface SkillPickerProps {
  catalogue: Skill[];
  value: PickedSkill[];
  onChange: (next: PickedSkill[]) => void;
  /** Called when user creates a new skill — parent should update catalogue state */
  onSkillCreated: (skill: Skill) => void;
  /** Async function that calls POST /v1/skills and returns the created Skill */
  createSkill: (name: string) => Promise<Skill>;
}

const LEVELS: SkillLevel[] = ["intermediate", "advanced", "expert"];
const LEVEL_LABEL: Record<SkillLevel, string> = {
  intermediate: "intermédiaire",
  advanced: "avancé",
  expert: "expert",
};

const MAX_PRIMARY = 3;

export function SkillPicker({
  catalogue,
  value,
  onChange,
  onSkillCreated,
  createSkill,
}: SkillPickerProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

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

  const showCreateOption =
    search.trim().length > 0 &&
    !catalogue.some(
      (s) => s.name.toLowerCase() === search.trim().toLowerCase(),
    );

  const primaryCount = value.filter((s) => s.is_primary).length;

  function toggle(id: string) {
    const has = value.find((x) => x.skill_id === id);
    if (has) {
      onChange(value.filter((x) => x.skill_id !== id));
    } else {
      onChange([
        ...value,
        { skill_id: id, level: "advanced", is_primary: false, validated_via_cv_import: false },
      ]);
    }
  }

  function setLevel(id: string, lvl: SkillLevel) {
    onChange(value.map((x) => (x.skill_id === id ? { ...x, level: lvl } : x)));
  }

  function togglePrimary(id: string) {
    const skill = value.find((x) => x.skill_id === id);
    if (!skill) return;
    if (!skill.is_primary && primaryCount >= MAX_PRIMARY) return;
    onChange(value.map((x) => (x.skill_id === id ? { ...x, is_primary: !x.is_primary } : x)));
  }

  async function handleCreate() {
    const name = search.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const newSkill = await createSkill(name);
      onSkillCreated(newSkill);
      onChange([
        ...value,
        { skill_id: newSkill.id, level: "advanced", is_primary: false, validated_via_cv_import: false },
      ]);
      setSearch("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.8}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && showCreateOption) handleCreate();
          }}
          placeholder="Cherche ou crée une skill (pitch, design, react…)"
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

        {showCreateOption && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-full border border-dashed border-mira-red/60 bg-mira-red/5 px-3 py-1.5 text-[13px] font-medium text-mira-red transition-colors hover:bg-mira-red/10 disabled:opacity-50"
          >
            {creating ? "Création…" : `+ Créer "${search.trim()}"`}
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tes skills sélectionnées — choisis ton niveau
            </p>
            <p className="text-[11px] text-muted-foreground">
              <Star className="mr-0.5 inline h-3 w-3 fill-amber-400 text-amber-400" />
              {primaryCount}/{MAX_PRIMARY} primaires
            </p>
          </div>
          <ul className="space-y-2">
            {value.map((s) => {
              const canMarkPrimary = s.is_primary || primaryCount < MAX_PRIMARY;
              return (
                <li
                  key={s.skill_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-card px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePrimary(s.skill_id)}
                      title={
                        s.is_primary
                          ? "Retirer des primaires"
                          : canMarkPrimary
                            ? "Marquer comme primaire"
                            : `Maximum ${MAX_PRIMARY} primaires`
                      }
                      className={cn(
                        "transition-opacity",
                        !canMarkPrimary && !s.is_primary && "cursor-not-allowed opacity-30",
                      )}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
                          s.is_primary
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground hover:text-amber-400",
                        )}
                        strokeWidth={1.8}
                      />
                    </button>
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
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
