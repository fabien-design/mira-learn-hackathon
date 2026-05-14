"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { MiraLogo } from "./Logo";
import { NavUserMenu } from "./NavUserMenu";

const SECTIONS = [
  { href: "/admin/applications", label: "Candidatures", active: true },
  { href: "#", label: "Mentors", active: false },
  { href: "#", label: "Classes", active: false },
  { href: "#", label: "Apprenants", active: false },
];

export function AdminNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-rule bg-card">
      <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-6 px-6 md:px-8">
        <Link href="/admin/applications" className="shrink-0">
          <MiraLogo admin />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden gap-1.5 md:flex">
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

        {/* Desktop right */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            href="/mentors"
            className="text-[13px] font-medium text-muted-foreground hover:text-charcoal"
          >
            ↗ Voir le site public
          </Link>
          {user?.email && (
            <div className="ml-7">
              <NavUserMenu email={user.email} isAdmin />
            </div>
          )}
        </div>

        {/* Mobile right */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {user?.email && <NavUserMenu email={user.email} isAdmin />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Ouvrir le menu admin"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-warm-beige"
              >
                <Menu className="h-4.5 w-4.5" strokeWidth={1.8} />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle asChild>
                  <span>
                    <MiraLogo admin />
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4 py-2">
                {SECTIONS.map((s) => (
                  <SheetClose asChild key={s.label}>
                    <Link
                      href={s.href}
                      className={cn(
                        "rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                        s.active
                          ? "bg-warm-beige font-semibold text-charcoal"
                          : "text-muted-foreground hover:bg-warm-beige hover:text-charcoal",
                      )}
                    >
                      {s.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/mentors"
                    className="rounded-lg px-3 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-warm-beige hover:text-charcoal"
                  >
                    ↗ Voir le site public
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
