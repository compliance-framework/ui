import type { Risk } from '@/oscal';

type LooseRisk = Risk & Record<string, unknown>;

function readString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function getRiskIdentifier(risk: Risk | null | undefined): string {
  if (!risk) return '';
  const source = risk as LooseRisk;

  return readString(source, ['uuid', 'riskUuid', 'id', 'riskId']) || '';
}

export function sameRiskIdentifier(left: Risk, right: Risk): boolean {
  const leftId = getRiskIdentifier(left);
  const rightId = getRiskIdentifier(right);
  return !!leftId && !!rightId && leftId === rightId;
}
