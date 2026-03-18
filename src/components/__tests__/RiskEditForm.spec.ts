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

  it('hydrates suggested remediation fields from recommendation lifecycle entry', async () => {
    const wrapper = mountForm(
      makeRisk({
        remediations: [
          {
            uuid: 'rec-1',
            lifecycle: 'recommendation',
            title: 'Template recommendation',
            description: 'Recommendation details',
            tasks: [
              {
                uuid: 'task-1',
                type: 'action',
                title: 'Rotate credentials',
              },
            ],
          },
          {
            uuid: 'plan-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
            description: 'Planned work',
          },
        ],
      }),
    );
    await flushPromises();

    expect(
      (
        wrapper.get('[data-testid="suggested-remediation-title"]')
          .element as HTMLInputElement
      ).value,
    ).toBe('Template recommendation');
    expect(
      (
        wrapper.get('[data-testid="suggested-remediation-description"]')
          .element as HTMLTextAreaElement
      ).value,
    ).toBe('Recommendation details');
    expect(
      (
        wrapper.get('[data-testid="suggested-remediation-task-0"]')
          .element as HTMLInputElement
      ).value,
    ).toBe('Rotate credentials');
  });

  it('updates recommendation while preserving non-recommendation remediations', async () => {
    const wrapper = mountForm(
      makeRisk({
        remediations: [
          {
            uuid: 'rec-1',
            lifecycle: 'recommendation',
            title: 'Old recommendation',
            description: 'Old recommendation details',
          },
          {
            uuid: 'plan-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
            description: 'Planned work',
          },
        ],
      }),
    );

    await wrapper
      .get('[data-testid="suggested-remediation-title"]')
      .setValue('Updated recommendation');
    await wrapper
      .get('[data-testid="suggested-remediation-description"]')
      .setValue('Updated recommendation details');
    await wrapper
      .get('[data-testid="suggested-remediation-task-add"]')
      .trigger('click');
    await wrapper
      .get('[data-testid="suggested-remediation-task-0"]')
      .setValue('Re-key database');
    await wrapper.find('form').trigger('submit');

    expect(mockUpdateRisk).toHaveBeenCalledWith({
      data: expect.objectContaining({
        remediations: [
          expect.objectContaining({
            uuid: 'rec-1',
            lifecycle: 'recommendation',
            title: 'Updated recommendation',
            description: 'Updated recommendation details',
            tasks: [
              expect.objectContaining({
                type: 'action',
                title: 'Re-key database',
              }),
            ],
          }),
          expect.objectContaining({
            uuid: 'plan-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
          }),
        ],
      }),
    });
  });

  it('removes recommendation entry when suggested remediation fields are cleared', async () => {
    const wrapper = mountForm(
      makeRisk({
        remediations: [
          {
            uuid: 'rec-1',
            lifecycle: 'recommendation',
            title: 'Old recommendation',
            description: 'Old recommendation details',
          },
          {
            uuid: 'plan-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
            description: 'Planned work',
          },
        ],
      }),
    );

    await wrapper
      .get('[data-testid="suggested-remediation-title"]')
      .setValue('');
    await wrapper
      .get('[data-testid="suggested-remediation-description"]')
      .setValue('');
    await wrapper.find('form').trigger('submit');

    expect(mockUpdateRisk).toHaveBeenCalledWith({
      data: expect.objectContaining({
        remediations: [
          expect.objectContaining({
            uuid: 'plan-1',
            lifecycle: 'planned',
            title: 'Planned remediation',
          }),
        ],
      }),
    });
  });
});
