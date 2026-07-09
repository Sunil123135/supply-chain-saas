"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/solutions", label: "Solutions" },
  { href: "/sarvam", label: "Sarvam AI" },
  { href: "/technology", label: "Technology" },
  { href: "/industries", label: "Industries" },
  { href: "/transformation", label: "AI-Workforce" },
  { href: "/experience", label: "Experience" },
] as const;

const APP_LINKS = [
  { href: "/app", label: "App" },
  { href: "/dashboard", label: "Control Tower" },
  { href: "/features", label: "Pain Map" },
  { href: "/import", label: "Import" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-extrabold text-white">
            Y
          </span>
          <span className="font-display text-sm font-bold tracking-tight text-[var(--foreground)]">
            Yugam
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "bg-[var(--muted)] text-[var(--accent)]"
                    : "text-[var(--muted-fg)] hover:text-[var(--foreground)]",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark((d) => !d)}
            className="hidden rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted-fg)] sm:inline-flex"
          >
            {dark ? "Light" : "Dark"}
          </button>
          <Link
            href="/experience"
            className="hidden text-xs font-semibold text-[var(--accent)] sm:inline"
          >
            Enter the Experience
          </Link>
          <Link href="/login" className="hidden text-xs text-[var(--muted-fg)] md:inline">
            Login
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Book a Demo
          </Link>
          <Link
            href="/app/sarvam"
            className="hidden rounded-full border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] md:inline-flex"
          >
            Talk to Sarvam
          </Link>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            Menu
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 lg:hidden">
          <ul className="space-y-2">
            {[...NAV, ...APP_LINKS, { href: "/contact", label: "Contact" }, { href: "/case-studies", label: "Case Studies" }].map(
              (l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block text-sm text-[var(--foreground)]">
                    {l.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
