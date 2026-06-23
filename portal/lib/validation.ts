import { z } from 'zod';

export const propertySchema = z.object({
  square_footage: z.number().finite().positive('Square footage must be greater than 0.'),
  bedrooms: z.number().finite().positive('Bedrooms must be greater than 0.'),
  bathrooms: z.number().finite().positive('Bathrooms must be greater than 0.'),
  year_built: z.number().finite().int('Year built must be a whole number.').min(1800, 'Year built is too old.').max(new Date().getFullYear() + 1, 'Year built is too far in the future.'),
  lot_size: z.number().finite().positive('Lot size must be greater than 0.'),
  distance_to_city_center: z.number().finite().nonnegative('Distance cannot be negative.'),
  school_rating: z.number().finite().min(0, 'School rating cannot be negative.').max(10, 'School rating must be at most 10.')
});

export type PropertyInput = z.infer<typeof propertySchema>;

export const propertyRequestSchema = z.object({
  features: propertySchema.optional(),
  instances: z.array(propertySchema).optional()
}).refine((value) => Boolean(value.features || value.instances), {
  message: 'Provide either features or instances.'
}).refine((value) => !(value.features && value.instances), {
  message: 'Provide only one of features or instances.'
});

export function coercePropertyInput(raw: Record<string, string>) {
  return {
    square_footage: Number(raw.square_footage),
    bedrooms: Number(raw.bedrooms),
    bathrooms: Number(raw.bathrooms),
    year_built: Number(raw.year_built),
    lot_size: Number(raw.lot_size),
    distance_to_city_center: Number(raw.distance_to_city_center),
    school_rating: Number(raw.school_rating)
  } satisfies Record<string, number>;
}