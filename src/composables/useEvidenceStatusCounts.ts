import type { ComplianceIntervalStatus } from '@/stores/evidence';

export type EvidenceStatusCounts = {
  total: number;
  red: number;
  green: number;
  gray: number;
};

export function computeEvidenceStatusCounts(
  entries: ComplianceIntervalStatus[],
): EvidenceStatusCounts {
  return entries.reduce<EvidenceStatusCounts>(
    (acc, current) => {
      const status = current.status?.toLowerCase();
      acc.total += current.count;

      if (status === 'satisfied') {
        acc.green += current.count;
      } else if (status === 'not-satisfied') {
        acc.red += current.count;
      } else {
        acc.gray += current.count;
      }

      return acc;
    },
    { total: 0, red: 0, green: 0, gray: 0 },
  );
}
