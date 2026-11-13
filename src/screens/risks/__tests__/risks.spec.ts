import { describe, expect, it } from 'vitest';
import { defaultRiskFilters } from '@/utils/risk-register';
import {
  readRegisterView,
  registerLink,
  registerQuery,
  riskBadge,
} from '../risks';

describe('risks', () => {
  it('maps statuses and levels to the shared badges, including medium as moderate', () => {
    expect(riskBadge('open')).toBe('risk-open');
    expect(riskBadge('risk-accepted')).toBe('risk-accepted');
    expect(riskBadge('medium')).toBe('risk-moderate');
    expect(riskBadge('made-up')).toBeUndefined();
  });

  it("reads the classic register's filter parameters and keeps defaults out of the URL", () => {
    const view = readRegisterView({});
    expect(view.filters).toEqual(defaultRiskFilters);
    expect(registerQuery(view)).toEqual({});

    const narrowed = readRegisterView({
      status: 'all',
      likelihood: 'medium',
      review: 'overdue',
      sort: 'impact',
      dir: 'asc',
    });
    expect(registerQuery(narrowed)).toEqual({
      status: 'all',
      likelihood: 'moderate',
      review: 'overdue',
      sort: 'impact',
      dir: 'asc',
    });
  });

  it('builds dashboard drill-downs into the register', () => {
    expect(registerLink('sys-1', { review: 'overdue' })).toEqual({
      name: 'system-risks-register',
      params: { systemId: 'sys-1' },
      query: { review: 'overdue' },
    });
  });
});
