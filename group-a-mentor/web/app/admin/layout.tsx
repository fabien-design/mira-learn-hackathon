"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminNav } from "@/components/mira/AdminNav";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = user?.user_metadata?.role === "admin";

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
    else if (!isAdmin) router.push("/");
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </main>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto w-full max-w-[1080px] px-6 py-10 md:px-8">{children}</main>
    </div>
  );
}
