"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { MiraLogo } from "@/components/mira/Logo";
import { MiraButton } from "@/components/mira/MiraButton";
import { MiraCard } from "@/components/mira/MiraCard";
import { SectionTitle } from "@/components/mira/SectionTitle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    router.push("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <Link href="/" className="mb-8">
        <MiraLogo />
      </Link>
      <MiraCard className="w-full max-w-md">
        <SectionTitle as="h1" size="page" className="text-center">
          Se connecter
        </SectionTitle>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Mira ouvre les portes aux candidats mentors et aux admins.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 rounded-xl border-rule bg-card text-base focus-visible:border-mira-red focus-visible:ring-mira-red/15"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-error/[0.08] px-3.5 py-2.5 text-sm text-error">
              {error}
            </p>
          )}
          <MiraButton type="submit" disabled={loading} className="w-full">
            {loading ? "Connexion…" : "Se connecter"}
          </MiraButton>
          <p className="text-center text-[12px] text-muted-foreground">
            Comptes test : <code>emma.rossi@hackathon.test</code> /{" "}
            <code>Hackathon2026!</code>
          </p>
        </form>
      </MiraCard>
    </main>
  );
}
