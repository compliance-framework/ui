import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import StatusCapsule from '@/ds/components/StatusCapsule/StatusCapsule.vue';
import EvidenceCapsule from '../EvidenceCapsule.vue';

const calls = vi.hoisted(() => [] as { url: string; params: unknown }[]);
const results = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string, config: { params?: unknown }) => {
    calls.push({ url, params: config.params });
    return { data: ref(results.value), execute: vi.fn(async () => undefined) };
  },
}));

const global = { stubs: { Tooltip: { template: '<slot />' } } };

describe('EvidenceCapsule', () => {
  it("counts a control's results for its plan, or a filter's, green, grey and red", async () => {
    results.value = [
      { status: 'satisfied', count: 3 },
      { status: 'unknown', count: 2 },
      { status: 'not-satisfied', count: 1 },
    ];
    const control = mount(EvidenceCapsule, {
      props: { controlId: 'ac-2', sspId: 'ssp-1' },
      global,
    });
    mount(EvidenceCapsule, { props: { filterId: 'f1' }, global });
    await flushPromises();
    expect(control.findComponent(StatusCapsule).props('segments')).toEqual([
      { status: 'satisfied', count: 3 },
      { status: 'unknown', count: 2 },
      { status: 'not-satisfied', count: 1 },
    ]);
    expect(calls).toEqual([
      {
        url: '/api/evidence/compliance-by-control/ac-2',
        params: { sspId: 'ssp-1' },
      },
      { url: '/api/evidence/compliance-by-filter/f1', params: {} },
    ]);
  });

  it('says there is no evidence yet, or nothing when quiet', () => {
    results.value = [];
    expect(mount(EvidenceCapsule, { props: { filterId: 'f1' } }).text()).toBe(
      'No evidence yet.',
    );
    expect(
      mount(EvidenceCapsule, { props: { filterId: 'f1', quiet: true } }).text(),
    ).toBe('');
  });
});
