import { getModelProfile } from '@/lib/model';
import { PropertyEstimatorClient } from '@/components/property-estimator-client';

export default async function PropertyValueEstimatorPage() {
  const modelProfile = await getModelProfile();

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">App 1</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Property Value Estimator</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Submit property details, validate the input on the client, review the predicted value, compare estimates, and keep a local history of previous submissions.
          </p>
        </div>
        <PropertyEstimatorClient modelProfile={modelProfile} />
      </div>
    </main>
  );
}