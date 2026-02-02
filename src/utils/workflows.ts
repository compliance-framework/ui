import type { EvidenceRequirement, EvidenceType } from '@/types/workflows';

export function parseEvidenceRequired(
  rawValue?: string | EvidenceRequirement[] | null,
): EvidenceRequirement[] {
  if (!rawValue) {
    return [];
  }

  // Already an array (new format)
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  // Try to parse as JSON string (legacy format fallback)
  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      // Check if it's the new format (objects with type/description/required)
      if (
        parsed.length > 0 &&
        typeof parsed[0] === 'object' &&
        'type' in parsed[0]
      ) {
        return parsed as EvidenceRequirement[];
      }
      // Legacy format: array of strings - convert to new format
      return parsed.map(
        (type: string): EvidenceRequirement => ({
          type: type as EvidenceType,
          description: '',
          required: true,
        }),
      );
    }
  } catch {
    // Ignore parse errors and fall back to an empty list
  }

  return [];
}

export function stringifyEvidenceRequired(types: EvidenceType[]): string {
  return JSON.stringify(types);
}

export function hasEvidenceRequirement(
  rawValue?: string | EvidenceRequirement[] | null,
): boolean {
  const requirements = parseEvidenceRequired(rawValue);
  return requirements.length > 0;
}

export function getRequiredEvidenceTypes(
  requirements?: EvidenceRequirement[] | null,
): EvidenceType[] {
  if (!requirements || !Array.isArray(requirements)) {
    return [];
  }
  return requirements.filter((req) => req.required).map((req) => req.type);
}
