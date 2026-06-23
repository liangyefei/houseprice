import { NextResponse } from 'next/server';

import { getMarketSummary } from '@/lib/dataset';
import { getModelProfile, predictLinearModel } from '@/lib/model';
import { propertySchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = propertySchema.safeParse(payload?.features ?? payload);

  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues[0]?.message ?? 'Invalid what-if payload.' }, { status: 400 });
  }

  const javaApiUrl = process.env.JAVA_API_URL;
  if (javaApiUrl) {
    try {
      const response = await fetch(new URL('/api/market/what-if', javaApiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: parsed.data }),
        cache: 'no-store'
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Local fallback below.
    }
  }

  const [profile, summary] = await Promise.all([getModelProfile(), getMarketSummary()]);
  const prediction = predictLinearModel(parsed.data, profile);
  const deltaFromAverage = prediction - summary.averagePrice;

  return NextResponse.json({
    prediction,
    averagePrice: summary.averagePrice,
    deltaFromAverage,
    premiumPercent: summary.averagePrice ? (deltaFromAverage / summary.averagePrice) * 100 : 0
  });
}