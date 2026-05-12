"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type NomadSinceChip =
  | "Moins d'un an"
  | "1 – 2 ans"
  | "3 – 5 ans"
  | "Plus de 5 ans"
  | "Pas encore — je prépare le saut";

type PriorClassesChip = "regular" | "few" | "informal" | "never";

type ApplicationData = {
  id: string;
  status: string;
  first_name: string;
  last_name: string;
  nomad_since_year: number | null;
  prior_masterclasses_count: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Identité",
  "Import",
  "Profil",
  "Masterclass",
  "Format",
  "Simulation",
  "Soumission",
];

const NOMAD_SINCE_OPTIONS: NomadSinceChip[] = [
  "Moins d'un an",
  "1 – 2 ans",
  "3 – 5 ans",
  "Plus de 5 ans",
  "Pas encore — je prépare le saut",
];

const PRIOR_CLASSES_LABELS: Record<PriorClassesChip, string> = {
  regular: "Oui, régulièrement",
  few: "Quelques-unes",
  informal: "Du mentoring informel",
  never: "Jamais — ce serait une première",
};

// UI chip → DB integer
const NOMAD_SINCE_TO_YEAR: Record<NomadSinceChip, number | null> = {
  "Moins d'un an": 2025,
  "1 – 2 ans": 2024,
  "3 – 5 ans": 2021,
  "Plus de 5 ans": 2018,
  "Pas encore — je prépare le saut": null,
};

const PRIOR_CLASSES_TO_COUNT: Record<PriorClassesChip, number> = {
  regular: 5,
  few: 3,
  informal: 1,
  never: 0,
};

// DB integer → UI chip (reverse mapping for pre-fill)
function yearToNomadChip(year: number | null): NomadSinceChip {
  if (year === null) return "Pas encore — je prépare le saut";
  if (year >= 2025) return "Moins d'un an";
  if (year >= 2024) return "1 – 2 ans";
  if (year >= 2021) return "3 – 5 ans";
  return "Plus de 5 ans";
}

function countToPriorChip(count: number): PriorClassesChip {
  if (count >= 5) return "regular";
  if (count >= 3) return "few";
  if (count >= 1) return "informal";
  return "never";
}

// ─── WizardProgress ───────────────────────────────────────────────────────────

function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < currentStep;
        const active = n === currentStep;
        return (
          <React.Fragment key={label}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: done ? "#E6332A" : active ? "#1D1D1B" : "transparent",
                  border: done || active ? "none" : "1.5px solid #d1d5db",
                  color: done || active ? "#fff" : "#9ca3af",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: "all 200ms",
                }}
              >
                {done ? "✓" : n}
              </span>
              {active && (
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#1D1D1B",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              )}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <span
                style={{
                  flex: 1,
                  height: 2,
                  background: n < currentStep ? "#E6332A" : "#e5e7eb",
                  borderRadius: 2,
                  minWidth: 12,
                  transition: "background 250ms",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Input component ─────────────────────────────────────────────────────────

function TextInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#1D1D1B",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: 12,
          border: `1.5px solid ${focused ? "#E6332A" : "#e5e7eb"}`,
          background: "#fff",
          fontSize: 15,
          color: "#1D1D1B",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "var(--font-sans)",
          transition: "border-color 180ms",
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Step1Page() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nomadSince, setNomadSince] = useState<NomadSinceChip | null>(null);
  const [priorClasses, setPriorClasses] = useState<PriorClassesChip | null>(null);

  const [existing, setExisting] = useState<ApplicationData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    nomadSince !== null &&
    priorClasses !== null;

  // Pre-fill form if user has an existing draft
  useEffect(() => {
    apiClient
      .get<ApplicationData | null>("/v1/mentors/applications/me")
      .then((data) => {
        if (data && data.status === "draft") {
          setExisting(data);
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setNomadSince(yearToNomadChip(data.nomad_since_year));
          setPriorClasses(countToPriorChip(data.prior_masterclasses_count));
        } else if (data && data.status !== "draft") {
          // Already submitted → redirect to status page
          router.replace("/me/application");
        }
      })
      .catch(() => {
        // 401 handled by layout; other errors → start fresh
      })
      .finally(() => setInitialLoading(false));
  }, [router]);

  async function handleSubmit() {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      nomad_since_year: NOMAD_SINCE_TO_YEAR[nomadSince!],
      prior_masterclasses_count: PRIOR_CLASSES_TO_COUNT[priorClasses!],
    };

    try {
      if (existing) {
        await apiClient.patch("/v1/mentors/applications/me", payload);
      } else {
        await apiClient.post("/v1/mentors/applications", payload);
      }
      router.push("/mentors/apply/step-2");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSaving(false);
    }
  }

  if (initialLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#efeae5",
        }}
      >
        <span style={{ color: "#9ca3af", fontSize: 14 }}>Chargement…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#efeae5" }}>
      {/* Nav */}
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 600,
              color: "#E6332A",
            }}
          >
            Mira Learn
          </span>
          <a
            href="/mentors"
            style={{
              fontSize: 13,
              color: "#6b7280",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Quitter
          </a>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "36px 24px 80px",
        }}
      >
        <WizardProgress currentStep={1} />

        <div style={{ marginTop: 40, maxWidth: 720 }}>
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#E6332A",
              marginBottom: 10,
            }}
          >
            Étape 1 · Identité
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 38,
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              margin: 0,
              color: "#1D1D1B",
            }}
          >
            Commençons par{" "}
            <span style={{ fontStyle: "italic" }}>te connaître.</span>
          </h2>

          {/* Subtitle */}
          <p
            style={{
              marginTop: 12,
              fontSize: 16,
              color: "#6b7280",
              lineHeight: 1.55,
              maxWidth: 560,
            }}
          >
            On ne te demande que l'essentiel. Le reste arrive après.
          </p>

          {/* Form */}
          <div style={{ marginTop: 32 }}>
            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#dc2626",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
              }}
            >
              {/* Prénom + Nom */}
              <TextInput
                label="Prénom"
                placeholder="Emma"
                value={firstName}
                onChange={setFirstName}
              />
              <TextInput
                label="Nom"
                placeholder="Rossi"
                value={lastName}
                onChange={setLastName}
              />

              {/* Nomad since */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1D1D1B",
                    marginBottom: 10,
                  }}
                >
                  Depuis combien de temps es-tu nomade ?
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {NOMAD_SINCE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNomadSince(opt)}
                      style={{
                        padding: "0 16px",
                        height: 38,
                        borderRadius: 9999,
                        border: `1.5px solid ${nomadSince === opt ? "#E6332A" : "#e5e7eb"}`,
                        background: nomadSince === opt ? "#E6332A" : "#fff",
                        color: nomadSince === opt ? "#fff" : "#1D1D1B",
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 150ms",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prior masterclasses */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1D1D1B",
                    marginBottom: 10,
                  }}
                >
                  As-tu déjà animé des masterclasses ?
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(
                    Object.entries(PRIOR_CLASSES_LABELS) as [
                      PriorClassesChip,
                      string,
                    ][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPriorClasses(val)}
                      style={{
                        padding: "0 16px",
                        height: 38,
                        borderRadius: 9999,
                        border: `1.5px solid ${priorClasses === val ? "#E6332A" : "#e5e7eb"}`,
                        background: priorClasses === val ? "#E6332A" : "#fff",
                        color: priorClasses === val ? "#fff" : "#1D1D1B",
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 150ms",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {priorClasses === "never" && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 14px",
                      background: "rgba(230,51,42,0.05)",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#1D1D1B",
                      lineHeight: 1.55,
                    }}
                  >
                    Pas un souci — on t'accompagne pour ta première. La majorité
                    de nos mentors n'avaient jamais enseigné avant Mira.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                marginTop: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || saving}
                style={{
                  padding: "0 28px",
                  height: 46,
                  borderRadius: 12,
                  background: isValid && !saving ? "#E6332A" : "#f3f4f6",
                  color: isValid && !saving ? "#fff" : "#9ca3af",
                  border: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isValid && !saving ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 150ms, color 150ms",
                  fontFamily: "var(--font-sans)",
                  opacity: !isValid ? 0.6 : 1,
                }}
              >
                {saving ? "Enregistrement…" : "Continuer →"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
