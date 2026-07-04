import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Control Tower" },
  { href: "/features", label: "Pain Map" },
  { href: "/copilot", label: "Copilot" },
  { href: "/import", label: "Import" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-bold tracking-tight text-emerald-400">
          Yugam
        </Link>
        <ul className="flex flex-wrap items-center gap-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-600 hover:text-emerald-300"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
