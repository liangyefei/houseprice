import { NextRequest, NextResponse } from 'next/server';

import { filterMarketRecords, getMarketDataset } from '@/lib/dataset';

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

function readCsv(rows: Awaited<ReturnType<typeof getMarketDataset>>) {
  const headers = ['id', 'square_footage', 'bedrooms', 'bathrooms', 'year_built', 'lot_size', 'distance_to_city_center', 'school_rating', 'price'];
  return [headers.join(','), ...rows.map((record) => headers.map((header) => String(record[header as keyof typeof record])).join(','))].join('\n');
}

function buildPdf(lines: string[]) {
  const safeLines = lines.map((line) => line.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'));
  const content = ['BT', '/F1 12 Tf', '50 760 Td', ...safeLines.flatMap((line, index) => (index === 0 ? [`(${line}) Tj`] : [`0 -18 Td (${line}) Tj`])), 'ET'].join('\n');
  const objects = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj`
  ];

  let offset = 0;
  const xrefEntries = ['0000000000 65535 f '];
  const body = objects.map((object) => {
    xrefEntries.push(`${String(offset).padStart(10, '0')} 00000 n `);
    offset += Buffer.byteLength(`${object}\n`, 'utf8');
    return `${object}\n`;
  }).join('');

  const xref = `xref\n0 ${xrefEntries.length}\n${xrefEntries.join('\n')}\ntrailer << /Size ${xrefEntries.length} /Root 1 0 R >>\nstartxref\n${Buffer.byteLength(body, 'utf8')}\n%%EOF`;
  return Buffer.from(`${body}${xref}`, 'utf8');
}

export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get('format') ?? 'csv').toLowerCase();
  const rows = filterMarketRecords(await getMarketDataset(), readFilters(request));

  if (format === 'pdf') {
    const average = rows.length ? Math.round(rows.reduce((total, row) => total + row.price, 0) / rows.length) : 0;
    const lines = [
      'HousePrice Market Report',
      `Listings: ${rows.length}`,
      `Average price: ${average}`,
      '',
      'Top properties:'
    ];
    rows.slice(0, 6).forEach((row) => {
      lines.push(`${row.id} | ${row.bedrooms} bd | ${row.square_footage} sqft | ${row.price}`);
    });

    return new NextResponse(buildPdf(lines), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="market-analysis.pdf"'
      }
    });
  }

  return new NextResponse(readCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="market-analysis.csv"'
    }
  });
}