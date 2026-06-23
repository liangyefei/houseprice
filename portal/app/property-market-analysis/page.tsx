import { getMarketDataset, getMarketSummary } from '@/lib/dataset';
import { getModelProfile } from '@/lib/model';
import { MarketAnalysisClient } from '@/components/market-analysis-client';

export default async function PropertyMarketAnalysisPage() {
  const [dataset, summary, modelProfile] = await Promise.all([getMarketDataset(), getMarketSummary(), getModelProfile()]);

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300">App 2</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Property Market Analysis</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Explore the housing dataset with filters, trends, what-if analysis, sortable tables, and export controls. The dashboard is server-rendered first, then enhanced client-side.
          </p>
        </div>
        <MarketAnalysisClient dataset={dataset} summary={summary} modelProfile={modelProfile} />
      </div>
    </main>
  );
}