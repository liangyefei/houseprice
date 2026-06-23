import { NextResponse } from 'next/server';

import { getModelProfile, predictLinearModel } from '@/lib/model';
import { propertyRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = propertyRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues[0]?.message ?? 'Invalid prediction payload.' }, { status: 400 });
  }

  const pythonApiUrl = process.env.PYTHON_API_URL;
  if (pythonApiUrl) {
    try {
      const response = await fetch(new URL('/predict', pythonApiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Fall back to the checked-in artifact.
    }
  }

  const profile = await getModelProfile();
  const records = parsed.data.instances ?? (parsed.data.features ? [parsed.data.features] : []);
  const predictions = records.map((record) => predictLinearModel(record, profile));

  return NextResponse.json({ predictions });
}