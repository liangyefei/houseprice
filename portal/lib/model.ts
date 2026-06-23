import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

import type { ModelProfile } from '@/lib/model-shared';

export type { ModelProfile } from '@/lib/model-shared';
export { formatCurrency, predictLinearModel } from '@/lib/model-shared';

const repoRoot = path.resolve(process.cwd(), '..');
const modelMetaPath = path.join(repoRoot, 'models', 'model_meta.json');

const fallbackProfile: ModelProfile = {
  featureNames: [
    'square_footage',
    'bedrooms',
    'bathrooms',
    'year_built',
    'lot_size',
    'distance_to_city_center',
    'school_rating'
  ],
  coefficients: [120.0, 5000.0, 9000.0, 350.0, 4.5, -3200.0, 14000.0],
  intercept: -650000,
  metrics: {
    r2: 0.9811236825879982,
    rmse: 10277.04797106169,
    mae: 7916.1980620897375
  },
  trainedAt: '',
  trainingSource: 'fallback'
};

export const getModelProfile = cache(async function getModelProfile(): Promise<ModelProfile> {
  try {
    const raw = await fs.readFile(modelMetaPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      feature_names?: string[];
      coefficients?: number[];
      intercept?: number;
      metrics?: { r2?: number; rmse?: number; mae?: number };
      trained_at?: string;
      training_source?: string;
    };

    return {
      featureNames: parsed.feature_names ?? fallbackProfile.featureNames,
      coefficients: parsed.coefficients ?? fallbackProfile.coefficients,
      intercept: parsed.intercept ?? fallbackProfile.intercept,
      metrics: {
        r2: parsed.metrics?.r2 ?? fallbackProfile.metrics.r2,
        rmse: parsed.metrics?.rmse ?? fallbackProfile.metrics.rmse,
        mae: parsed.metrics?.mae ?? fallbackProfile.metrics.mae
      },
      trainedAt: parsed.trained_at ?? '',
      trainingSource: parsed.training_source ?? ''
    };
  } catch {
    // The Python container may not have trained/exported the artifact yet.
    return fallbackProfile;
  }
});
