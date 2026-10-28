import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import EvidenceByControlView from '../EvidenceByControlView.vue';

const getForControl = vi.fn();
vi.mock('@/stores/evidence.ts', () => ({
  useEvidenceStore: () => ({ getForControl }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'ac-2' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe('EvidenceByControlView', () => {
  // GET /api/evidence/for-control/:id returns labels: null.
  it('renders evidence whose labels are null instead of crashing', async () => {
    getForControl.mockResolvedValue({
      metadata: { control: { id: 'ac-2', title: 'Account Management' } },
      data: [
        {
          uuid: 'ev-1',
          title: 'Evidence 0',
          status: { state: 'satisfied' },
          labels: null,
          end: '2026-10-10T12:00:00Z',
        },
      ],
    });

    const wrapper = mount(EvidenceByControlView, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
        directives: { tooltip: {} },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('ac-2 - Account Management');
    expect(wrapper.text()).toContain('Evidence 0');
  });
});
