"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import { MiraAvatar } from "./MiraAvatar";
import { MiraLogo } from "./Logo";

const SECTIONS = [
  { href: "/admin/applications", label: "Candidatures", active: true },
  { href: "#", label: "Mentors", active: false },
  { href: "#", label: "Classes", active: false },
  { href: "#", label: "Apprenants", active: false },
];

export function AdminNav() {
  const { user } = useAuth();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="border-b border-rule bg-card">
      <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-6 px-6 md:px-8">
        <Link href="/admin/applications" className="shrink-0">
          <MiraLogo admin />
        </Link>
        <nav className="ml-2 flex gap-1.5">
          {SECTIONS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className={
                s.active
                  ? "rounded-md bg-warm-beige px-3 py-1.5 text-[13px] font-semibold text-charcoal"
                  : "rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:text-charcoal"
              }
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/mentors"
            className="text-[13px] font-medium text-muted-foreground hover:text-charcoal"
          >
            ↗ Voir le site public
          </Link>
          {user?.email && <MiraAvatar name={user.email} size={32} className="ml-7" />}
          <button
            type="button"
            onClick={logout}
            className="text-[13px] font-medium text-muted-foreground hover:text-charcoal"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
