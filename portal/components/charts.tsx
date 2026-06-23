import { formatCurrency } from '@/lib/model-shared';

export function MiniMetric({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {delta ? <div className="mt-1 text-xs text-emerald-300">{delta}</div> : null}
    </div>
  );
}

export function BarChart({
  title,
  data,
  format = 'currency'
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  format?: 'currency' | 'count';
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const renderValue = (value: number) => (format === 'currency' ? formatCurrency(value) : value.toLocaleString());

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>{item.label}</span>
              <span>{renderValue(item.value)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/8">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
                role="img"
                aria-label={`${item.label}: ${renderValue(item.value)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function ComparisonBars({ values }: { values: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...values.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>{item.label}</span>
            <span>{formatCurrency(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/8">
            <div className="h-2 rounded-full bg-gradient-to-r from-amber-300 to-cyan-400" style={{ width: `${(item.value / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}