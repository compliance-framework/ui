import type { Evidence } from '@/stores/evidence';

// CSV export for evidence search results, shared by the classic evidence page and the
// redesigned System Evidence screen. Each record is flattened to dotted columns, labels become
// `label.<name>` columns, and cells that a spreadsheet would run as a formula are neutralised.

const CSV_EXCLUDED_HEADERS = new Set([
  'id',
  'uuid',
  'labels',
  'origins',
  'backMatter',
]);

function sanitizeCsvCell(value: string) {
  if (value.match(/^\s*[=+\-@]/)) {
    return "'" + value;
  }

  return value;
}

function flattenCsvRecord(
  value: unknown,
  prefix = '',
  output: Record<string, string> = {},
) {
  if (value === null || value === undefined) {
    if (prefix) {
      output[prefix] = '';
    }

    return output;
  }

  if (Array.isArray(value)) {
    if (prefix) {
      output[prefix] = JSON.stringify(value);
    }

    return output;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      if (prefix) {
        output[prefix] = '{}';
      }

      return output;
    }

    for (const [key, nestedValue] of entries) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenCsvRecord(nestedValue, nextPrefix, output);
    }

    return output;
  }

  if (prefix) {
    output[prefix] = String(value);
  }

  return output;
}

function isExcludedCsvHeader(header: string) {
  for (const excludedHeader of CSV_EXCLUDED_HEADERS) {
    if (header === excludedHeader || header.startsWith(`${excludedHeader}.`)) {
      return true;
    }
  }

  return false;
}

export function buildEvidenceCsv(evidenceItems: Evidence[]) {
  const payloadHeaders = new Set<string>();
  const labelHeaders = new Set<string>();
  const rows = evidenceItems.map((item) => {
    const row = flattenCsvRecord(item);

    for (const header of Object.keys(row)) {
      if (!header.startsWith('label.') && !isExcludedCsvHeader(header)) {
        payloadHeaders.add(header);
      }
    }

    for (const label of item.labels ?? []) {
      const labelHeader = `label.${label.name}`;
      const existingValue = row[labelHeader];
      row[labelHeader] =
        existingValue == null || existingValue === ''
          ? label.value
          : `${existingValue}; ${label.value}`;
      labelHeaders.add(labelHeader);
    }

    return row;
  });

  const headers = [
    ...Array.from(payloadHeaders).sort(),
    ...Array.from(labelHeaders).sort(),
  ];

  return [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ]
    .map((row) =>
      row
        .map((cell) => `"${sanitizeCsvCell(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
}

export function downloadCsv(csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evidence-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
