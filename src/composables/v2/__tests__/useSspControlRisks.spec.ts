import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { Risk } from '@/oscal';
import { useSspControlRisks } from '../useSspControlRisks';

const data = ref<Risk[] | undefined>(undefined);
const execute = vi.fn(async () => undefined);
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({ data, error: ref(null), execute }),
}));

function risk(fields: Record<string, unknown>): Risk {
  return { uuid: 'r', title: 'Risk', ...fields } as unknown as Risk;
}

describe('useSspControlRisks', () => {
  it('fetches the SSP risks once with the 100-risk cap', async () => {
    const sspId = ref<string | undefined>('ssp-1');
    useSspControlRisks(sspId);
    await nextTick();

    expect(execute).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/risks?limit=100',
    );
  });

  it('counts open risks per control and per control + component', () => {
    const { controlRisks, componentRisks } = useSspControlRisks(ref('ssp-1'));
    data.value = [
      risk({
        status: 'open',
        impact: 'medium',
        controlIds: ['AC-2'],
        componentIds: ['comp-1'],
      }),
      risk({ status: 'open', impact: 'low', controlIds: ['ac-2'] }),
      risk({ status: 'closed', impact: 'high', controlIds: ['ac-2'] }),
      risk({ status: 'remediated', impact: 'high', controlIds: ['ac-2'] }),
    ];

    expect(controlRisks('ac-2')).toEqual({
      count: 2,
      capped: false,
      severity: 'medium',
    });
    expect(componentRisks('AC-2', 'COMP-1')?.count).toBe(1);
    expect(componentRisks('ac-2', 'comp-2')).toBeNull();
    expect(controlRisks('ac-3')).toBeNull();
  });

  it('treats a risk without an impact as high', () => {
    const { controlRisks } = useSspControlRisks(ref('ssp-1'));
    data.value = [
      risk({ status: 'open', impact: 'low', controlIds: ['ac-2'] }),
      risk({ status: 'open', controlIds: ['ac-2'] }),
    ];

    expect(controlRisks('ac-2')?.severity).toBe('high');
  });

  it('marks counts as capped when the fetch hit the limit', () => {
    const { controlRisks } = useSspControlRisks(ref('ssp-1'));
    data.value = Array.from({ length: 100 }, () =>
      risk({ status: 'open', impact: 'high', controlIds: ['ac-2'] }),
    );

    expect(controlRisks('ac-2')).toMatchObject({ count: 100, capped: true });
  });
});
