import type { PropertyInput } from '@/lib/validation';

export type ModelProfile = {
  featureNames: string[];
  coefficients: number[];
  intercept: number;
  metrics: {
    r2: number;
    rmse: number;
    mae: number;
  };
  trainedAt: string;
  trainingSource: string;
};

export function predictLinearModel(features: PropertyInput, profile: ModelProfile) {
  return profile.featureNames.reduce((total, featureName, index) => {
    const coefficient = profile.coefficients[index] ?? 0;
    const value = features[featureName as keyof PropertyInput] ?? 0;
    return total + coefficient * Number(value);
  }, profile.intercept);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
