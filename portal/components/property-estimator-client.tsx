'use client';

import { useMemo, useState, useTransition } from 'react';

import { ComparisonBars } from '@/components/charts';
import { Button, Panel, PanelLead, PanelTitle, SecondaryButton, TextField } from '@/components/ui';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { defaultPropertyForm, propertyFieldMeta, type PropertyFormState } from '@/lib/property-fields';
import { formatCurrency, predictLinearModel, type ModelProfile } from '@/lib/model-shared';
import { propertySchema, type PropertyInput } from '@/lib/validation';

type EstimateRecord = {
  id: string;
  createdAt: string;
  input: PropertyInput;
  prediction: number;
};

export function PropertyEstimatorClient({ modelProfile }: { modelProfile: ModelProfile }) {
  const [formState, setFormState] = useState<PropertyFormState>(defaultPropertyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PropertyFormState, string>>>({});
  const [result, setResult] = useState<number | null>(null);
  const [submissionError, setSubmissionError] = useState('');
  const [history, setHistory, historyReady] = useLocalStorage<EstimateRecord[]>('houseprice-estimate-history', []);
  const [isPending, startTransition] = useTransition();

  const historySlice = history.slice(0, 5);
  const comparisonData = useMemo(() => {
    const current = result === null ? [] : [{ id: 'current', createdAt: new Date().toISOString(), input: formState, prediction: result }];
    return [...current, ...historySlice].slice(0, 5);
  }, [formState, historySlice, result]);

  function updateField(key: keyof PropertyFormState, rawValue: string) {
    const nextValue = Number(rawValue);
    setFormState((current) => ({ ...current, [key]: nextValue }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submitEstimate() {
    const parsed = propertySchema.safeParse(formState);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof PropertyFormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PropertyFormState | undefined;
        if (key) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setSubmissionError('');
      setResult(null);
      return;
    }

    setFieldErrors({});
    setSubmissionError('');

    startTransition(async () => {
      try {
        const response = await fetch('/api/property/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: parsed.data })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { detail?: string };
          throw new Error(payload.detail ?? 'Prediction request failed.');
        }

        const payload = (await response.json()) as { predictions: number[] };
        const prediction = payload.predictions[0] ?? 0;
        setResult(prediction);

        const entry: EstimateRecord = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          input: parsed.data,
          prediction
        };

        setHistory((current) => [entry, ...current].slice(0, 10));
      } catch {
        const prediction = predictLinearModel(parsed.data, modelProfile);
        setResult(prediction);
        setSubmissionError('Python backend unavailable, so the portal used the checked-in model artifact.');

        const entry: EstimateRecord = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          input: parsed.data,
          prediction
        };

        setHistory((current) => [entry, ...current].slice(0, 10));
      }
    });
  }

  const chartMax = Math.max(...comparisonData.map((entry) => entry.prediction), 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelTitle>Property form</PanelTitle>
            <PanelLead>Validate locally, then submit to the Python model service.</PanelLead>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Python backend ready
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {propertyFieldMeta.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              placeholder={field.placeholder}
              value={Number.isFinite(formState[field.key]) ? formState[field.key] : ''}
              onChange={(event) => updateField(field.key, event.target.value)}
              error={fieldErrors[field.key]}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={submitEstimate} disabled={isPending}>Generate estimate</Button>
          <SecondaryButton
            type="button"
            onClick={() => {
              setFormState(defaultPropertyForm);
              setFieldErrors({});
              setSubmissionError('');
            }}
          >
            Reset form
          </SecondaryButton>
        </div>

        {submissionError ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{submissionError}</div> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-white">Latest result</h3>
            <table className="mt-4 w-full text-sm">
              <tbody className="divide-y divide-white/8">
                <ResultRow label="Predicted value" value={result === null ? 'Awaiting submission' : formatCurrency(result)} />
                <ResultRow label="Model R2" value={modelProfile.metrics.r2.toFixed(3)} />
                <ResultRow label="RMSE" value={formatCurrency(modelProfile.metrics.rmse)} />
                <ResultRow label="MAE" value={formatCurrency(modelProfile.metrics.mae)} />
              </tbody>
            </table>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Prediction chart</h3>
              <span className="text-xs text-slate-400">Current estimate plus history</span>
            </div>
            <div className="mt-4 flex min-h-56 items-end gap-3">
              {comparisonData.map((entry) => (
                <div key={entry.id} className="flex flex-1 flex-col items-center gap-2 text-center">
                  <div className="w-full rounded-t-2xl bg-emerald-400/10 p-2">
                    <div className="rounded-t-2xl bg-gradient-to-t from-emerald-500 to-amber-400" style={{ height: `${Math.max((entry.prediction / chartMax) * 220, 18)}px` }} />
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <aside className="space-y-6">
        <Panel>
          <PanelTitle>Estimate history</PanelTitle>
          <PanelLead>Stored locally in the browser so previous estimates survive navigation.</PanelLead>
          <div className="mt-5 space-y-3">
            {(historyReady ? historySlice : []).map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{formatCurrency(entry.prediction)}</div>
                    <div className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">saved</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <CompactStat label="Sq Ft" value={entry.input.square_footage} />
                  <CompactStat label="Beds" value={entry.input.bedrooms} />
                  <CompactStat label="Baths" value={entry.input.bathrooms} />
                  <CompactStat label="School" value={entry.input.school_rating} />
                </div>
              </article>
            ))}
            {historyReady && historySlice.length === 0 ? <EmptyState text="No estimates have been saved yet." /> : null}
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Comparison view</PanelTitle>
          <PanelLead>Review multiple estimates side by side.</PanelLead>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1.1fr_0.9fr] gap-px bg-white/10 text-sm">
              <div className="bg-slate-950 px-3 py-2 font-semibold text-slate-200">Property</div>
              <div className="bg-slate-950 px-3 py-2 font-semibold text-slate-200">Prediction</div>
            </div>
            {comparisonData.slice(0, 4).map((entry, index) => (
              <div key={entry.id} className="grid grid-cols-[1.1fr_0.9fr] gap-px bg-white/10 text-sm">
                <div className="bg-slate-950/80 px-3 py-3 text-slate-300">Scenario {index + 1}</div>
                <div className="bg-slate-950/80 px-3 py-3 font-semibold text-white">{formatCurrency(entry.prediction)}</div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <ComparisonBars values={comparisonData.slice(0, 4).map((entry, index) => ({ label: `Scenario ${index + 1}`, value: entry.prediction }))} />
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-3 pr-4 text-slate-400">{label}</td>
      <td className="py-3 text-right font-medium text-white">{value}</td>
    </tr>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-slate-400">{text}</div>;
}