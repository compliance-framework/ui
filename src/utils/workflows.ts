import type { EvidenceType } from '@/types/workflows';

export function parseEvidenceRequired(
  rawValue?: string | null,
): EvidenceType[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (value): value is EvidenceType => typeof value === 'string',
      );
    }
  } catch {
    // Ignore parse errors and fall back to an empty list
  }

  return [];
}

export function stringifyEvidenceRequired(values: EvidenceType[]): string {
  return JSON.stringify(values);
}

export function hasEvidenceRequirement(rawValue?: string | null): boolean {
  return parseEvidenceRequired(rawValue).length > 0;
}
