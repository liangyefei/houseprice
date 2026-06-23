import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

import { parseCsv } from '@/lib/csv';

export type MarketRecord = {
  id: number;
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
  price: number;
};

export type MarketSummary = {
  totalListings: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  averageSquareFootage: number;
  averageSchoolRating: number;
  averageDistance: number;
  priceBands: { label: string; count: number }[];
  bedroomSegments: { label: string; count: number; averagePrice: number }[];
  topComparables: MarketRecord[];
  modelMetrics: {
    r2: number;
    rmse: number;
    mae: number;
  };
};

export type MarketFilters = {
  bedrooms: number[];
  minPrice: number;
  maxPrice: number;
};

const repoRoot = path.resolve(process.cwd(), '..');
const datasetPath = path.join(repoRoot, 'data', 'House Price Dataset.csv');

function mean(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

export function filterMarketRecords(records: MarketRecord[], filters: MarketFilters) {
  return records.filter((record) => {
    const bedroomsMatch = filters.bedrooms.length === 0 || filters.bedrooms.includes(record.bedrooms);
    const priceMatch = record.price >= filters.minPrice && record.price <= filters.maxPrice;
    return bedroomsMatch && priceMatch;
  });
}

export function summarizeMarketRecords(records: MarketRecord[]): MarketSummary {
  const prices = records.map((record) => record.price).sort((left, right) => left - right);
  const bedrooms = [...new Set(records.map((record) => record.bedrooms))].sort((left, right) => left - right);

  const priceBands = [
    { label: '< $200k', count: records.filter((record) => record.price < 200000).length },
    { label: '$200k - $275k', count: records.filter((record) => record.price >= 200000 && record.price < 275000).length },
    { label: '$275k - $350k', count: records.filter((record) => record.price >= 275000 && record.price < 350000).length },
    { label: '$350k+', count: records.filter((record) => record.price >= 350000).length }
  ];

  const bedroomSegments = bedrooms.map((bedroomCount) => {
    const group = records.filter((record) => record.bedrooms === bedroomCount);
    return {
      label: `${bedroomCount} BR`,
      count: group.length,
      averagePrice: mean(group.map((record) => record.price))
    };
  });

  return {
    totalListings: records.length,
    averagePrice: mean(prices),
    medianPrice: prices.length ? prices[Math.floor(prices.length / 2)] : 0,
    minPrice: prices.length ? prices[0] : 0,
    maxPrice: prices.length ? prices[prices.length - 1] : 0,
    averageSquareFootage: mean(records.map((record) => record.square_footage)),
    averageSchoolRating: mean(records.map((record) => record.school_rating)),
    averageDistance: mean(records.map((record) => record.distance_to_city_center)),
    priceBands,
    bedroomSegments,
    topComparables: [...records].sort((left, right) => right.price - left.price).slice(0, 6),
    modelMetrics: {
      r2: 0.9811236825879982,
      rmse: 10277.04797106169,
      mae: 7916.1980620897375
    }
  };
}

export const getMarketDataset = cache(async function getMarketDataset(): Promise<MarketRecord[]> {
  const raw = await fs.readFile(datasetPath, 'utf8');
  return parseCsv(raw).map((row) => ({
    id: Number(row.id),
    square_footage: Number(row.square_footage),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    year_built: Number(row.year_built),
    lot_size: Number(row.lot_size),
    distance_to_city_center: Number(row.distance_to_city_center),
    school_rating: Number(row.school_rating),
    price: Number(row.price)
  }));
});

export const getMarketSummary = cache(async function getMarketSummary(filters?: MarketFilters): Promise<MarketSummary> {
  const dataset = await getMarketDataset();
  const effectiveFilters: MarketFilters = filters ?? {
    bedrooms: [],
    minPrice: Number.NEGATIVE_INFINITY,
    maxPrice: Number.POSITIVE_INFINITY
  };

  return summarizeMarketRecords(filterMarketRecords(dataset, effectiveFilters));
});