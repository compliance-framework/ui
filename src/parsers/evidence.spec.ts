import { describe, it, expect } from 'vitest';

import { calculateComplianceOverTimeData } from '@/parsers/findings.ts';
import type { ComplianceInterval } from '@/stores/findings.ts';

describe('EvidenceFiller', () => {
  it('fills missing statusses', () => {
    const statusData = [
      {
        interval: '2025-07-11T13:02:06.835978+01:00',
        statuses: [
          {
            status: 'satisfied',
            count: 1,
          },
        ],
      },
    ] as ComplianceInterval[];
    expect(calculateComplianceOverTimeData(statusData).datasets.length).toEqual(
      1,
    );
    expect(
      calculateComplianceOverTimeData(statusData, [
        'satisfied',
        'not-satisfied',
      ]).datasets.length,
    ).toEqual(2);
  });
});
