export function parseCsv(text: string) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((header) => header.trim());

  return lines.map((line) => {
    const values = line.split(',');
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = (values[index] ?? '').trim();
      return row;
    }, {});
  });
}