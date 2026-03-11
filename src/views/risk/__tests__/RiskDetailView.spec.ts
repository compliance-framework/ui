import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import RiskDetailView from '../RiskDetailView.vue';

const mockRoute = {
  name: 'system-security-plan-risk-detail',
  params: {
    id: 'ssp-1',
    riskId: 'risk-1',
  },
};

const mockRisk = {
  uuid: 'risk-1',
  title: 'Database Encryption Risk',
  description: 'Encryption policy drift.',
  statement: 'Data at rest may not be encrypted.',
  status: 'open',
  riskLog: { entries: [] },
};

const mockToastAdd = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}));

vi.mock('@/stores/system', () => ({
  useSystemStore: () => ({
    system: {
      poam: { uuid: 'poam-1' },
      securityPlan: { uuid: 'ssp-1' },
    },
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: vi.fn((input) => input),
  useDataApi: () => {
    const data = ref();
    const isLoading = ref(false);
    const error = ref(null);

    const execute = vi.fn(async (arg?: unknown) => {
      const endpoint =
        typeof arg === 'string'
          ? arg
          : typeof arg === 'object' && arg
            ? (arg as { url?: string }).url || ''
            : '';

      if (typeof endpoint === 'string' && endpoint.endsWith('/risks/risk-1')) {
        data.value = mockRisk;
      } else if (
        typeof endpoint === 'string' &&
        endpoint.endsWith('/system-security-plans/ssp-1/risks')
      ) {
        data.value = [mockRisk];
      } else if (typeof endpoint === 'string' && endpoint.includes('/events')) {
        data.value = [
          {
            uuid: 'evt-1',
            eventType: 'created',
            createdAt: '2026-03-11T10:00:00Z',
            actorName: 'System',
            details: 'Risk created',
          },
        ];
      } else {
        data.value = [];
      }

      return { data };
    });

    return {
      data,
      error,
      isLoading,
      execute,
    };
  },
}));

function mountComponent() {
  return mount(RiskDetailView, {
    global: {
      stubs: {
        PageHeader: { template: '<div><slot /></div>' },
        Message: { template: '<div><slot /></div>' },
        Dialog: { template: '<div><slot /></div>' },
        TertiaryButton: { template: '<button><slot /></button>' },
        RouterLinkButton: { template: '<button><slot /></button>' },
        RiskLogTab: { template: '<div>Risk log tab</div>' },
      },
    },
  });
}

describe('RiskDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the new risk detail tabs and history event entry', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Overview');
    expect(text).toContain('Evidence');
    expect(text).toContain('Controls');
    expect(text).toContain('Components');
    expect(text).toContain('History & Events');
    expect(text).toContain('Log');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'History & Events')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Risk created');
  });
});
