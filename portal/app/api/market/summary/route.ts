import { NextRequest, NextResponse } from 'next/server';

import { filterMarketRecords, getMarketDataset, summarizeMarketRecords } from '@/lib/dataset';

export const runtime = 'nodejs';

function readFilters(request: NextRequest) {
  const bedrooms = (request.nextUrl.searchParams.get('bedrooms') ?? '')
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return {
    bedrooms,
    minPrice: Number(request.nextUrl.searchParams.get('minPrice') ?? '0') || 0,
    maxPrice: Number(request.nextUrl.searchParams.get('maxPrice') ?? String(Number.POSITIVE_INFINITY)) || Number.POSITIVE_INFINITY
  };
}

export async function GET(request: NextRequest) {
  const javaApiUrl = process.env.JAVA_API_URL;
  if (javaApiUrl) {
    try {
      const response = await fetch(new URL(`/api/market/summary?${request.nextUrl.searchParams.toString()}`, javaApiUrl), {
        cache: 'no-store'
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Local fallback below.
    }
  }

  const dataset = await getMarketDataset();
  const filters = readFilters(request);
  return NextResponse.json(summarizeMarketRecords(filterMarketRecords(dataset, filters)));
}