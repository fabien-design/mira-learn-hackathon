"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, apiClient } from "@/lib/api-client";
import type {
  ApplicationSkill,
  CVImport,
  ClassSuggestion,
  MentorApplication,
  MiraClass,
} from "@/types/mentor";

interface UseApplicationResult {
  application: MentorApplication | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<MentorApplication | null>;
}

/** Fetch + cache l'application courante du user. */
export function useApplication(): UseApplicationResult {
  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MentorApplication | null>(
        "/v1/mentors/applications/me",
      );
      setApplication(data);
      return data;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur réseau";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { application, loading, error, refresh };
}

// ---- Helpers de fetch tunnel ------------------------------------------------

export async function fetchMyClasses(): Promise<MiraClass[]> {
  return apiClient.get<MiraClass[]>("/v1/mentors/applications/me/classes");
}

export async function fetchMySkills(): Promise<ApplicationSkill[]> {
  return apiClient.get<ApplicationSkill[]>(
    "/v1/mentors/applications/me/skills",
  );
}

export async function fetchMySuggestions(
  status?: "proposed" | "adopted" | "rejected" | "modified",
): Promise<ClassSuggestion[]> {
  const path = status
    ? `/v1/mentors/applications/me/class-suggestions?status=${status}`
    : "/v1/mentors/applications/me/class-suggestions";
  return apiClient.get<ClassSuggestion[]>(path);
}

export async function fetchCVImport(id: string): Promise<CVImport> {
  return apiClient.get<CVImport>(`/v1/mentors/applications/me/cv-imports/${id}`);
}
