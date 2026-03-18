import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, shallowRef, toValue } from 'vue';
import type { Risk } from '@/oscal';

const mockUpdateRisk = vi.fn().mockResolvedValue({});
const toastAdd = vi.fn();

const returnedRisk = shallowRef<Risk>({
  uuid: 'risk-1',
  title: 'Updated Risk',
  description: 'Updated description',
  statement: 'Updated statement',
  status: 'open',
});
const updateRiskLoading = ref(false);

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: unknown, config?: { method?: string }) => {
    const resolvedUrl = String(toValue(url as never) ?? '');

    if (
      resolvedUrl.includes('/api/oscal/plan-of-action-and-milestones/') &&
      config?.method === 'PUT'
    ) {
      return {
        data: returnedRisk,
        isLoading: updateRiskLoading,
        execute: mockUpdateRisk,
      };
    }

    throw new Error(`Unexpected useDataApi invocation: ${resolvedUrl}`);
  },
  decamelizeKeys: vi.fn((data: unknown) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
    remove: vi.fn(),
  }),
}));

import RiskEditForm from '../risk/RiskEditForm.vue';

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    uuid: 'risk-1',
    title: 'Risk A',
    description: 'Risk description',
    statement: 'Risk statement',
    status: 'open',
    ...overrides,
  };
}

describe('RiskEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateRiskLoading.value = false;
    returnedRisk.value = makeRisk();
  });

  function mountForm(risk: Risk) {
    return mount(RiskEditForm, {
      props: {
        poamId: 'poam-1',
        risk,
      },
    });
  }

  it('shows guidance that threats and remediations moved to detail tabs', async () => {
    const wrapper = mountForm(makeRisk());
    await flushPromises();

    expect(wrapper.text()).toContain(
      'Threats and remediations are managed from the dedicated tabs on the risk detail view.',
    );
  });

  it('submits core risk updates while preserving existing threats and remediations', async () => {
    const wrapper = mountForm(
      makeRisk({
        threatIds: [{ id: 'T-001', system: 'CAPEC' }],
        remediations: [
          {
            uuid: 'remediation-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
            description: 'Planned work',
          },
        ],
      }),
    );

    await wrapper
      .find('input[placeholder="Enter risk title"]')
      .setValue('Risk B');
    await wrapper
      .find('textarea[placeholder="Enter risk description"]')
      .setValue('Updated description');
    await wrapper
      .find('textarea[placeholder="Enter risk statement"]')
      .setValue('Updated statement');
    await wrapper.find('select').setValue('investigating');
    await wrapper.find('form').trigger('submit');

    expect(mockUpdateRisk).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Risk B',
        description: 'Updated description',
        statement: 'Updated statement',
        status: 'investigating',
        threatIds: [{ id: 'T-001', system: 'CAPEC' }],
        remediations: [
          expect.objectContaining({
            uuid: 'remediation-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
          }),
        ],
      }),
    });
  });
});
