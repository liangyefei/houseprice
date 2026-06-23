export default function Loading() {
  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="portal-card animate-pulse rounded-3xl p-8">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="mt-4 h-10 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-full rounded bg-white/10" />
          <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="portal-card animate-pulse rounded-3xl p-6">
            <div className="h-4 w-28 rounded bg-white/10" />
            <div className="mt-4 space-y-3">
              <div className="h-10 rounded bg-white/10" />
              <div className="h-10 rounded bg-white/10" />
              <div className="h-10 rounded bg-white/10" />
            </div>
          </div>
          <div className="portal-card animate-pulse rounded-3xl p-6">
            <div className="h-4 w-28 rounded bg-white/10" />
            <div className="mt-4 h-64 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}