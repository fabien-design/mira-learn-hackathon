import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-(--warm-beige)">
      <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[12.5px] text-muted-foreground md:px-8">
        <span>© {new Date().getFullYear()} Hello Mira · Mira Learn</span>
        <nav className="flex gap-5">
          <Link href="/mentors" className="hover:text-charcoal">Mentors</Link>
          <Link href="/mentors/apply/step-1" className="hover:text-charcoal">Devenir mentor</Link>
          <Link href="/me/application" className="hover:text-charcoal">Ma candidature</Link>
        </nav>
      </div>
    </footer>
  );
}
