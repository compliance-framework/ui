import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { evidenceStatus } from '@/composables/useEvidenceStatusCounts';
import EvidencePill from '../EvidencePill.vue';

const calls = vi.hoisted(() => [] as { url: string; params: unknown }[]);
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string, config: { params?: unknown }) => {
    calls.push({ url, params: config.params });
    return {
      data: ref([
        { status: 'satisfied', count: 3 },
        { status: 'not-satisfied', count: 1 },
      ]),
      execute: vi.fn(async () => undefined),
    };
  },
}));

describe('evidenceStatus', () => {
  const counts = (green: number, gray: number, red: number) => ({
    total: green + gray + red,
    green,
    gray,
    red,
  });
  it('is not satisfied when any result is, satisfied only when every result is', () => {
    expect(evidenceStatus(counts(5, 2, 1))).toBe('not-satisfied');
    expect(evidenceStatus(counts(5, 0, 0))).toBe('satisfied');
    expect(evidenceStatus(counts(5, 1, 0))).toBe('unknown');
    expect(evidenceStatus(counts(0, 0, 0))).toBe('unknown');
  });
});

describe('EvidencePill', () => {
  it("reads a control's results for its plan, or a filter's", async () => {
    const control = mount(EvidencePill, {
      props: { controlId: 'ac-2', sspId: 'ssp-1' },
    });
    mount(EvidencePill, { props: { filterId: 'f1' } });
    await flushPromises();
    expect(control.text()).toBe('Not satisfied');
    expect(calls).toEqual([
      {
        url: '/api/evidence/compliance-by-control/ac-2',
        params: { sspId: 'ssp-1' },
      },
      { url: '/api/evidence/compliance-by-filter/f1', params: {} },
    ]);
  });
});
