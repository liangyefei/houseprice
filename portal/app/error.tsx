'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center shadow-glow">
        <p className="text-sm uppercase tracking-[0.28em] text-amber-300">Portal error</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{error.message}</p>
        <button
          className="mt-8 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          onClick={() => reset()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}