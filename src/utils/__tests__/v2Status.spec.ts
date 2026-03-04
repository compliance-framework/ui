import { describe, expect, it } from 'vitest';
import { getV2StatusMeta } from '@/utils/v2Status';

describe('getV2StatusMeta', () => {
  it('maps known statuses to expected labels and tones', () => {
    expect(getV2StatusMeta('active')).toEqual({
      label: 'Active',
      tone: 'success',
    });

    expect(getV2StatusMeta('pending')).toEqual({
      label: 'Pending',
      tone: 'warning',
    });

    expect(getV2StatusMeta('failed')).toEqual({
      label: 'Failed',
      tone: 'danger',
    });
  });

  it('humanizes unknown statuses as neutral', () => {
    expect(getV2StatusMeta('needs_review')).toEqual({
      label: 'Needs Review',
      tone: 'neutral',
    });
  });

  it('returns unknown for empty statuses', () => {
    expect(getV2StatusMeta('')).toEqual({
      label: 'Unknown',
      tone: 'neutral',
    });
  });
});
