export type PropertyFieldKey =
  | 'square_footage'
  | 'bedrooms'
  | 'bathrooms'
  | 'year_built'
  | 'lot_size'
  | 'distance_to_city_center'
  | 'school_rating';

export type PropertyFormState = Record<PropertyFieldKey, number>;

export const propertyFieldOrder: PropertyFieldKey[] = [
  'square_footage',
  'bedrooms',
  'bathrooms',
  'year_built',
  'lot_size',
  'distance_to_city_center',
  'school_rating'
];

export const propertyFieldMeta: Array<{
  key: PropertyFieldKey;
  label: string;
  placeholder: string;
  step?: number;
  min?: number;
  max?: number;
}> = [
  { key: 'square_footage', label: 'Square footage', placeholder: '1550', min: 200 },
  { key: 'bedrooms', label: 'Bedrooms', placeholder: '3', min: 0.5, step: 0.5 },
  { key: 'bathrooms', label: 'Bathrooms', placeholder: '2', min: 0.5, step: 0.5 },
  { key: 'year_built', label: 'Year built', placeholder: '1997', min: 1800, max: new Date().getFullYear() + 1 },
  { key: 'lot_size', label: 'Lot size', placeholder: '6800', min: 200 },
  { key: 'distance_to_city_center', label: 'Distance to city center', placeholder: '4.1', min: 0, step: 0.1 },
  { key: 'school_rating', label: 'School rating', placeholder: '7.6', min: 0, max: 10, step: 0.1 }
];

export const defaultPropertyForm: PropertyFormState = {
  square_footage: 1550,
  bedrooms: 3,
  bathrooms: 2,
  year_built: 1997,
  lot_size: 6800,
  distance_to_city_center: 4.1,
  school_rating: 7.6
};