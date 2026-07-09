import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[var(--muted)]/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold text-[var(--accent)]">Yugam</p>
          <p className="mt-2 text-sm text-[var(--muted-fg)]">
            Your technology thought partner for autonomous supply chains. One intelligent platform
            from planning to delivery — orchestrated by Sarvam.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
            Solutions
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/sarvam" className="hover:text-[var(--accent)]">
                Sarvam AI
              </Link>
            </li>
            <li>
              <Link href="/solutions" className="hover:text-[var(--accent)]">
                Predict · Plan · Execute
              </Link>
            </li>
            <li>
              <Link href="/technology" className="hover:text-[var(--accent)]">
                Technology & AI
              </Link>
            </li>
            <li>
              <Link href="/app" className="hover:text-[var(--accent)]">
                Product App
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
            Company
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-[var(--accent)]">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/industries" className="hover:text-[var(--accent)]">
                Industries
              </Link>
            </li>
            <li>
              <Link href="/case-studies" className="hover:text-[var(--accent)]">
                Case Studies
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[var(--accent)]">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
            Explore
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/experience" className="hover:text-[var(--accent)]">
                The Experience
              </Link>
            </li>
            <li>
              <Link href="/transformation" className="hover:text-[var(--accent)]">
                AI-Workforce
              </Link>
            </li>
            <li>
              <Link href="/features" className="hover:text-[var(--accent)]">
                Pain Map
              </Link>
            </li>
            <li>
              <Link href="/app/sarvam" className="hover:text-[var(--accent)]">
                Talk to Sarvam
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] px-6 py-4 text-center text-xs text-[var(--muted-fg)]">
        © {new Date().getFullYear()} Yugam. Intelligence layer for supply chain & logistics. Agent:
        Sarvam.
      </div>
    </footer>
  );
}
