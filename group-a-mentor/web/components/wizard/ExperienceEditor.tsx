"use client";

import { X } from "lucide-react";

import type { ProfessionalExperience } from "@/types/mentor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ExperienceEditorProps {
  value: ProfessionalExperience;
  onChange: (next: ProfessionalExperience) => void;
  onRemove: () => void;
}

export function ExperienceEditor({ value, onChange, onRemove }: ExperienceEditorProps) {
  return (
    <div className="rounded-2xl border border-rule bg-card p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
          placeholder="Rôle"
          className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
        />
        <Input
          value={value.company}
          onChange={(e) => onChange({ ...value, company: e.target.value })}
          placeholder="Entreprise"
          className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
        />
        <Input
          type="number"
          value={value.start_year || ""}
          onChange={(e) => onChange({ ...value, start_year: Number(e.target.value) || 0 })}
          placeholder="Année début"
          className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
        />
        <Input
          type="number"
          value={value.end_year ?? ""}
          onChange={(e) =>
            onChange({ ...value, end_year: e.target.value ? Number(e.target.value) : null })
          }
          placeholder="Année fin (vide si en cours)"
          className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
        />
      </div>
      <Textarea
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder="Ce que tu y faisais (2-3 lignes)."
        className="mt-3 min-h-24 rounded-xl border-rule bg-card p-4 text-sm focus-visible:border-mira-red focus-visible:ring-mira-red/15"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-error"
        >
          <X className="h-3 w-3" strokeWidth={2} /> Supprimer
        </button>
      </div>
    </div>
  );
}
