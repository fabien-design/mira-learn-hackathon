"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { MiraLogo } from "./Logo";

const NAV_ITEMS = [
  { href: "/mentors", label: "Mentors" },
];

export function PublicNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="sticky top-0 z-40 border-b border-black/5 bg-[color:var(--warm-beige)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center gap-9 px-6 md:px-8">
        <Link href="/" className="shrink-0">
          <MiraLogo />
        </Link>
        <div className="ml-6 flex gap-6">
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
        <div className="ml-auto flex items-center gap-3.5">
          {user ? (
            <Link href="/me/application" className="text-sm font-medium text-charcoal hover:underline">
              Ma candidature
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-charcoal">
              Se connecter
            </Link>
          )}
          <Link href="/mentors/apply/step-1">
            <Button className="h-11 rounded-xl px-5 text-sm font-semibold">
              Devenir mentor
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
