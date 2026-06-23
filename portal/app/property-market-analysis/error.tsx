'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
      <h2 className="text-xl font-semibold">Market dashboard failed to load.</h2>
      <p className="mt-2 text-sm text-red-100/80">{error.message}</p>
      <button type="button" onClick={reset} className="mt-5 rounded-full bg-red-400 px-4 py-2 text-sm font-medium text-slate-950">
        Retry
      </button>
    </div>
  );
}