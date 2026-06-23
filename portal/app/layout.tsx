import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'HousePrice Portal',
  description: 'Unified Next.js portal for property value estimation and market analysis.'
};

const navItems: Array<{ href: Route; label: string }> = [
  { href: '/', label: 'Portal Home' },
  { href: '/property-value-estimator', label: 'Property Value Estimator' },
  { href: '/property-market-analysis', label: 'Property Market Analysis' }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-amber-400 text-sm font-black text-slate-950 shadow-glow">
                  HP
                </span>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">HousePrice Portal</div>
                  <div className="text-xs text-slate-500">Next.js App Router</div>
                </div>
              </Link>
              <nav className="flex flex-wrap items-center justify-end gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <div className="portal-grid-bg fixed inset-0 -z-10 opacity-25" />
          <div className="relative">{children}</div>
          <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
            Built as a unified portal for property estimation and market analysis workflows.
          </footer>
        </div>
      </body>
    </html>
  );
}