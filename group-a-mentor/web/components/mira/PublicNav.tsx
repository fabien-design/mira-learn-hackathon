"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
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

const NAV_ITEMS = [
  { href: "/mentors", label: "Mentors" },
];

export function PublicNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === "admin";
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 border-b border-black/5 bg-(--warm-beige)/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-330 items-center gap-9 px-6 md:px-8">
        <Link href="/" className="shrink-0">
          <MiraLogo />
        </Link>

        {/* Desktop nav links */}
        <div className="ml-6 hidden gap-6 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href) ?? false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-2 text-sm font-medium transition-colors",
                  active ? "text-charcoal" : "text-muted-foreground hover:text-charcoal",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded bg-mira-red" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Desktop right side */}
        <div className="ml-auto hidden items-center gap-3.5 md:flex">
          {user ? (
            <Link
              href="/me/application"
              className="text-sm font-medium text-charcoal hover:underline"
            >
              Ma candidature
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-charcoal"
            >
              Se connecter
            </Link>
          )}
          <Link href="/mentors/apply/step-1">
            <Button className="h-11 rounded-xl px-5 text-sm font-semibold">
              Devenir mentor
            </Button>
          </Link>
          {user && (
            <div className="ml-3">
              <NavUserMenu email={user.email ?? user.id} isAdmin={isAdmin} />
            </div>
          )}
        </div>

        {/* Mobile right side */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {user && <NavUserMenu email={user.email ?? user.id} isAdmin={isAdmin} />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Ouvrir le menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-beige-deep"
                suppressHydrationWarning
              >
                <Menu className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle asChild>
                  <span>
                    <MiraLogo />
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4 py-2">
                {NAV_ITEMS.map((item) => {
                  const active = pathname?.startsWith(item.href) ?? false;
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                          active
                            ? "bg-warm-beige text-charcoal"
                            : "text-muted-foreground hover:bg-warm-beige hover:text-charcoal",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}

                {user ? (
                  <SheetClose asChild>
                    <Link
                      href="/me/application"
                      className="rounded-lg px-3 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-warm-beige hover:text-charcoal"
                    >
                      Ma candidature
                    </Link>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Link
                      href="/login"
                      className="rounded-lg px-3 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-warm-beige hover:text-charcoal"
                    >
                      Se connecter
                    </Link>
                  </SheetClose>
                )}
              </nav>

              <div className="mt-2 px-4">
                <SheetClose asChild>
                  <Link href="/mentors/apply/step-1" className="block">
                    <Button className="h-11 w-full rounded-xl text-sm font-semibold">
                      Devenir mentor
                    </Button>
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
