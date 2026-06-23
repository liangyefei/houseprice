import Link from 'next/link';

import { getMarketSummary } from '@/lib/dataset';
import { getModelProfile } from '@/lib/model';
import { Panel, PanelLead, PanelTitle } from '@/components/ui';

export default async function HomePage() {
  const [summary, modelProfile] = await Promise.all([getMarketSummary(), getModelProfile()]);

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="portal-surface rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Unified Next.js portal</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Two property applications, one consistent experience.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Estimate individual property value with the Python-backed workflow, then switch to market analytics for comparisons, what-if analysis, exports, and dataset-level insight.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/property-value-estimator" className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
              Open Property Value Estimator
            </Link>
            <Link href="/property-market-analysis" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Open Market Analysis
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Model R2" value={modelProfile.metrics.r2.toFixed(3)} accent="emerald" />
            <StatCard label="Average price" value={formatCurrency(summary.averagePrice)} accent="amber" />
            <StatCard label="Features used" value={String(modelProfile.featureNames.length)} accent="sky" />
          </div>
        </div>
        <div className="portal-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Portfolio snapshot</p>
          <div className="mt-5 grid gap-4">
            <MiniMetric label="Listings in dataset" value={summary.totalListings} />
            <MiniMetric label="Median price" value={formatCurrency(summary.medianPrice)} />
            <MiniMetric label="Highest price" value={formatCurrency(summary.maxPrice)} />
            <MiniMetric label="Lowest price" value={formatCurrency(summary.minPrice)} />
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-medium text-white">Deployment pattern</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              The portal uses React Server Components for initial data loading and defers interactive workflows to client components. Prediction requests can proxy to the Python and Java backends when those services are running.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3">
        <Panel>
          <PanelTitle>Shared layout</PanelTitle>
          <PanelLead>One navigation shell, one visual language, and route-level loading and error states.</PanelLead>
        </Panel>
        <Panel>
          <PanelTitle>Backend contracts</PanelTitle>
          <PanelLead>Python handles property estimates, while the market app uses a Java API contract with a local fallback.</PanelLead>
        </Panel>
        <Panel>
          <PanelTitle>Model context</PanelTitle>
          <PanelLead>{summary.totalListings} housing records and a regression model with R² {modelProfile.metrics.r2.toFixed(3)}.</PanelLead>
        </Panel>
      </section>
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'emerald' | 'amber' | 'sky' }) {
  const accentClasses = {
    emerald: 'from-emerald-400/25 to-emerald-400/5',
    amber: 'from-amber-400/25 to-amber-400/5',
    sky: 'from-sky-400/25 to-sky-400/5'
  }[accent];

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accentClasses} p-4`}>
      <div className="text-sm text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}