import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import PoamItemFacts from '../PoamItemFacts.vue';

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(
      url.endsWith('/risks')
        ? [{ uuid: 'r-1', title: 'Data loss' }]
        : url.endsWith('/observations')
          ? [{ uuid: 'o-1', description: 'Port open' }]
          : [],
    ),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

describe('PoamItemFacts', () => {
  it('names linked entries from the plan, and flags ones it cannot find', async () => {
    const wrapper = mount(PoamItemFacts, {
      props: {
        poamId: 'p-1',
        item: {
          uuid: 'i-1',
          title: 'MFA gap',
          description: 'Admins lack MFA',
          relatedObservations: [{ observationUuid: 'o-1' }],
          relatedRisks: [{ riskUuid: 'r-1' }, { riskUuid: 'r-gone' }],
        },
      },
    });
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Admins lack MFA');
    expect(text).toContain('Port open');
    expect(text).toContain('Data loss');
    expect(text).toContain('r-gone');
    expect(text).toContain('Not found in this plan');
    expect(text).toContain('No findings linked.');
  });
});
