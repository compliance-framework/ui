import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HistoryView from '../HistoryView.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      uuid: 'history-uuid-1',
    },
  }),
}));

describe('Evidence HistoryView', () => {
  it('renders the shared history section for the requested evidence uuid', () => {
    const wrapper = mount(HistoryView, {
      global: {
        stubs: {
          PageHeader: {
            template: '<h1><slot /></h1>',
          },
          PageSubHeader: {
            template: '<h2><slot /></h2>',
          },
          EvidenceHistorySection: {
            props: ['uuid'],
            template: '<div>EvidenceHistorySection {{ uuid }}</div>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Evidence History');
    expect(wrapper.text()).toContain('history-uuid-1');
    expect(wrapper.text()).toContain('EvidenceHistorySection history-uuid-1');
  });
});
