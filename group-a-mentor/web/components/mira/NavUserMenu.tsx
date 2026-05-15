"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, LayoutList } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const GRADIENTS: [string, string][] = [
  ["#E6332A", "#B12420"],
  ["#D4A853", "#9A7A36"],
  ["#1D1D1B", "#4A4A45"],
  ["#63B1BB", "#3F7F87"],
  ["#95C11F", "#658212"],
  ["#E6332A", "#FF7A4D"],
  ["#1D1D1B", "#6B7280"],
  ["#D4A853", "#E6332A"],
  ["#888888", "#4A4A45"],
];

function gradientFor(seed: string): [string, string] {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[n] ?? GRADIENTS[0];
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

interface NavUserMenuProps {
  email: string;
  isAdmin?: boolean;
}

export function NavUserMenu({ email, isAdmin = false }: NavUserMenuProps) {
  const router = useRouter();
  const [a, b] = gradientFor(initialsFrom(email));
  const initials = initialsFrom(email);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-mira-red focus-visible:ring-offset-2">
          <Avatar className="size-8 cursor-pointer border-0 after:hidden">
            <AvatarFallback
              style={{ background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)` }}
              className="text-[11px] font-semibold text-white"
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/me")}>
          <User className="size-4" />
          Profil
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push("/admin/applications")}>
            <LayoutList className="size-4" />
            Administration
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut className="size-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
