"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, PenLine, Upload } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { WizardShell } from "@/components/wizard/WizardShell";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { WizardStepHeader } from "@/components/wizard/WizardStepHeader";
import { ErrorBanner } from "@/components/wizard/ErrorBanner";
import { MethodCard } from "@/components/mira/MethodCard";
import type { CVImport, MentorApplication } from "@/types/mentor";

type Method = "linkedin" | "cv" | "manual";

export default function Step2Page() {
  const router = useRouter();
  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    apiClient
      .get<MentorApplication | null>("/v1/mentors/applications/me")
      .then((data) => {
        if (!data) {
          router.replace("/mentors/apply/step-1");
          return;
        }
        if (data.status !== "draft") {
          router.replace("/me/application");
          return;
        }
        setApplication(data);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur réseau."));
  }, [router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const cv = await apiClient.postForm<CVImport>("/v1/mentors/applications/me/cv-imports", form);
      router.push(`/mentors/apply/step-3?cv_import_id=${cv.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload échoué.");
      setUploading(false);
    }
  }

  function handleManual() {
    router.push("/mentors/apply/step-3");
  }

  return (
    <WizardShell currentStep={2}>
      <WizardStepHeader
        eyebrow="Étape 2 · Méthode"
        title={
          <>
            Comment <span className="font-serif-italic">préfères-tu commencer ?</span>
          </>
        }
        subtitle="Mira AI peut pré-remplir ton profil à partir de ton CV. Sinon, écris-le toi-même."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-4 md:grid-cols-3">
        <MethodCard
          disabled
          icon={<Link2 className="h-5 w-5" strokeWidth={1.8} />}
          badge="Bientôt"
          title="Importer ton LinkedIn"
          description="Mira lit ton profil et pré-remplit tes expériences."
        />
        <MethodCard
          selected={method === "cv"}
          icon={<Upload className="h-5 w-5" strokeWidth={1.8} />}
          title="Uploader ton CV PDF"
          description="Mira extrait tes expériences et skills, tu valides ensuite."
          onClick={() => {
            setMethod("cv");
            fileRef.current?.click();
          }}
        />
        <MethodCard
          selected={method === "manual"}
          icon={<PenLine className="h-5 w-5" strokeWidth={1.8} />}
          title="Renseigner en manuel"
          description="Tu écris ton profil de zéro, à ton rythme."
          onClick={() => {
            setMethod("manual");
            handleManual();
          }}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading && (
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" strokeWidth={1.8} /> Upload en cours…
        </p>
      )}

      <WizardFooter
        prevHref="/mentors/apply/step-1"
        onContinue={handleManual}
        continueLabel="Continuer manuellement"
        saving={uploading}
        draftSavedLabel={application ? "Brouillon enregistré" : ""}
      />
    </WizardShell>
  );
}
