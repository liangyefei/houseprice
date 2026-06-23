'use client';

import { useMemo, useState } from 'react';

import { BarChart, MiniMetric } from '@/components/charts';
import { Button, Panel, PanelLead, PanelTitle, SecondaryButton, SelectField, TextField } from '@/components/ui';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { defaultPropertyForm, propertyFieldMeta, type PropertyFormState } from '@/lib/property-fields';
import { formatCurrency, predictLinearModel, type ModelProfile } from '@/lib/model-shared';
import type { MarketRecord, MarketSummary } from '@/lib/dataset';
import { propertySchema } from '@/lib/validation';

type WhatIfResult = {
  prediction: number;
  averagePrice: number;
  deltaFromAverage: number;
  premiumPercent: number;
};

type SortKey = 'price' | 'square_footage' | 'school_rating' | 'distance_to_city_center';

export function MarketAnalysisClient({
  dataset,
  summary,
  modelProfile
}: {
  dataset: MarketRecord[];
  summary: MarketSummary;
  modelProfile: ModelProfile;
}) {
  const [filters, setFilters] = useState({
    bedrooms: 'all',
    minSchoolRating: 0,
    maxDistance: 20,
    sortKey: 'price' as SortKey
  });
  const [whatIfForm, setWhatIfForm] = useState<PropertyFormState>(defaultPropertyForm);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [whatIfError, setWhatIfError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [favorites, setFavorites] = useLocalStorage<MarketRecord[]>('houseprice-market-favorites', []);

  const visibleRows = useMemo(() => {
    const rows = dataset.filter((record) => {
      const bedroomPass = filters.bedrooms === 'all' ? true : record.bedrooms === Number(filters.bedrooms);
      const schoolPass = record.school_rating >= filters.minSchoolRating;
      const distancePass = record.distance_to_city_center <= filters.maxDistance;
      return bedroomPass && schoolPass && distancePass;
    });

    return [...rows].sort((left, right) => right[filters.sortKey] - left[filters.sortKey]);
  }, [dataset, filters]);

  const topComparison = visibleRows.slice(0, 4);

  async function calculateWhatIf() {
    const parsed = propertySchema.safeParse(whatIfForm);
    if (!parsed.success) {
      setWhatIfError(parsed.error.issues[0]?.message ?? 'Please correct the property inputs.');
      setWhatIfResult(null);
      return;
    }

    setWhatIfError('');

    try {
      const response = await fetch('/api/market/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: parsed.data })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail ?? 'What-if request failed.');
      }

      setWhatIfResult((await response.json()) as WhatIfResult);
      setStatusMessage('What-if analysis completed through the API route.');
    } catch {
      const prediction = predictLinearModel(parsed.data, modelProfile);
      setWhatIfResult({
        prediction,
        averagePrice: summary.averagePrice,
        deltaFromAverage: prediction - summary.averagePrice,
        premiumPercent: summary.averagePrice ? ((prediction - summary.averagePrice) / summary.averagePrice) * 100 : 0
      });
      setWhatIfError('Java backend unavailable, so the portal used the checked-in model artifact.');
      setStatusMessage('Fallback calculation completed locally.');
    }
  }

  function exportCsv() {
    const headers = ['id', 'square_footage', 'bedrooms', 'bathrooms', 'year_built', 'lot_size', 'distance_to_city_center', 'school_rating', 'price'];
    const csv = [headers.join(','), ...visibleRows.map((record) => headers.map((header) => String(record[header as keyof MarketRecord])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'property-market-analysis.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage('CSV export generated.');
  }

  function exportPdf() {
    window.print();
    setStatusMessage('Print dialog opened for PDF export.');
  }

  function toggleFavorite(record: MarketRecord) {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === record.id);
      return exists ? current.filter((item) => item.id !== record.id) : [record, ...current].slice(0, 6);
    });
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <PanelTitle>Market dashboard</PanelTitle>
            <PanelLead>Dataset-level overview with filters, what-if analysis, exports, and a sortable listing table.</PanelLead>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" onClick={exportCsv}>
              Export CSV
            </button>
            <button className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300" onClick={exportPdf}>
              Export PDF
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniMetric label="Listings" value={String(summary.totalListings)} delta={`${visibleRows.length} visible`} />
          <MiniMetric label="Average price" value={formatCurrency(summary.averagePrice)} />
          <MiniMetric label="Median price" value={formatCurrency(summary.medianPrice)} />
          <MiniMetric label="Average school rating" value={summary.averageSchoolRating.toFixed(1)} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <BarChart title="Price distribution" format="count" data={summary.priceBands.map((bar) => ({ label: bar.label, value: bar.count }))} />

          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
            <h3 className="text-lg font-semibold text-white">Bedroom segments</h3>
            <div className="mt-4 space-y-3">
              {summary.bedroomSegments.map((segment) => (
                <div key={segment.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{segment.label}</span>
                    <span className="text-sm text-slate-300">{segment.count} homes</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">Average price: {formatCurrency(segment.averagePrice)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Panel>
          <PanelTitle>Filters</PanelTitle>
          <PanelLead>Restrict the analysis by bedroom count, school rating, and distance to city center.</PanelLead>

          <div className="mt-5 grid gap-4">
            <SelectField label="Bedrooms" value={filters.bedrooms} onChange={(event) => setFilters((current) => ({ ...current, bedrooms: event.target.value }))}>
              <option value="all">All</option>
              {[...new Set(dataset.map((record) => record.bedrooms))].sort((left, right) => left - right).map((value) => (
                <option key={value} value={value}>{value} bedrooms</option>
              ))}
            </SelectField>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-100">Minimum school rating: {filters.minSchoolRating.toFixed(1)}</span>
              <input
                className="w-full accent-emerald-400"
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={filters.minSchoolRating}
                onChange={(event) => setFilters((current) => ({ ...current, minSchoolRating: Number(event.target.value) }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-100">Maximum distance: {filters.maxDistance.toFixed(1)}</span>
              <input
                className="w-full accent-emerald-400"
                type="range"
                min={0}
                max={20}
                step={0.1}
                value={filters.maxDistance}
                onChange={(event) => setFilters((current) => ({ ...current, maxDistance: Number(event.target.value) }))}
              />
            </label>

            <SelectField label="Sort by" value={filters.sortKey} onChange={(event) => setFilters((current) => ({ ...current, sortKey: event.target.value as SortKey }))}>
              <option value="price">Price</option>
              <option value="square_footage">Square footage</option>
              <option value="school_rating">School rating</option>
              <option value="distance_to_city_center">Distance to city center</option>
            </SelectField>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {visibleRows.length} properties match the current filters.
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {statusMessage || 'Use CSV or PDF export to share the current view.'}
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <PanelTitle>What-if analysis</PanelTitle>
              <PanelLead>Run a model-backed scenario and compare it against the market average.</PanelLead>
            </div>
            <Button type="button" onClick={() => void calculateWhatIf()}>Run analysis</Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {propertyFieldMeta.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                value={whatIfForm[field.key]}
                onChange={(event) => setWhatIfForm((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
              />
            ))}
          </div>

          {whatIfError ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{whatIfError}</div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Prediction" value={whatIfResult ? formatCurrency(whatIfResult.prediction) : '—'} />
            <MiniMetric label="Delta vs average" value={whatIfResult ? formatCurrency(whatIfResult.deltaFromAverage) : '—'} />
            <MiniMetric label="Premium" value={whatIfResult ? `${whatIfResult.premiumPercent.toFixed(1)}%` : '—'} />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.6fr] gap-px bg-white/10 text-sm">
              <div className="bg-slate-950 px-3 py-2 font-semibold text-slate-200">Property</div>
              <div className="bg-slate-950 px-3 py-2 font-semibold text-slate-200">Price</div>
              <div className="bg-slate-950 px-3 py-2 font-semibold text-slate-200">School</div>
              <div className="bg-slate-950 px-3 py-2 font-semibold text-slate-200">Save</div>
            </div>
            {topComparison.map((record) => {
              const saved = favorites.some((item) => item.id === record.id);
              return (
                <div key={record.id} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.6fr] gap-px bg-white/10 text-sm">
                  <div className="bg-slate-950/80 px-3 py-3 text-slate-300">{record.square_footage} sq ft</div>
                  <div className="bg-slate-950/80 px-3 py-3 font-semibold text-white">{formatCurrency(record.price)}</div>
                  <div className="bg-slate-950/80 px-3 py-3 text-slate-300">{record.school_rating.toFixed(1)}</div>
                  <div className="bg-slate-950/80 px-3 py-3">
                    <SecondaryButton type="button" onClick={() => toggleFavorite(record)} className={saved ? 'border-amber-400/30 bg-amber-400/15' : ''}>
                      {saved ? 'Saved' : 'Save'}
                    </SecondaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle>Responsive table</PanelTitle>
        <PanelLead>Sortable table with the filtered dataset slice.</PanelLead>
        <div className="mt-5 overflow-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-300">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Sq Ft</th>
                <th className="px-4 py-3">Beds</th>
                <th className="px-4 py-3">Baths</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8 bg-black/20">
              {visibleRows.map((record) => (
                <tr key={record.id} className="hover:bg-white/4">
                  <td className="px-4 py-3 text-slate-400">{record.id}</td>
                  <td className="px-4 py-3 text-white">{record.square_footage}</td>
                  <td className="px-4 py-3 text-white">{record.bedrooms}</td>
                  <td className="px-4 py-3 text-white">{record.bathrooms}</td>
                  <td className="px-4 py-3 text-white">{record.year_built}</td>
                  <td className="px-4 py-3 text-white">{record.distance_to_city_center.toFixed(1)}</td>
                  <td className="px-4 py-3 text-white">{record.school_rating.toFixed(1)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-200">{formatCurrency(record.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}