import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowRef } from 'vue';
import type { SystemSecurityPlan } from '@/oscal';

const mocks = vi.hoisted(() => ({
  createSystemSecurityPlan: vi.fn(),
  decamelizeKeys: vi.fn(),
  push: vi.fn(),
  toastAdd: vi.fn(),
  uuidv4: vi.fn(),
}));

const createdSystemSecurityPlan = shallowRef<SystemSecurityPlan | undefined>();

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: createdSystemSecurityPlan,
    execute: mocks.createSystemSecurityPlan,
  })),
  decamelizeKeys: mocks.decamelizeKeys,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mocks.toastAdd,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('uuid', () => ({
  v4: mocks.uuidv4,
}));

import { useDataApi } from '@/composables/axios';
import SystemSecurityPlanCreateView from '../system-security-plans/SystemSecurityPlanCreateView.vue';

const buttonStub = {
  props: ['type', 'disabled'],
  emits: ['click'],
  template:
    '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};

const formInputStub = {
  props: ['modelValue', 'required', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<input :required="required" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

function mountView() {
  return mount(SystemSecurityPlanCreateView, {
    global: {
      stubs: {
        PageHeader: { template: '<h1><slot /></h1>' },
        PageSubHeader: { template: '<h2><slot /></h2>' },
        PageCard: { template: '<div><slot /></div>' },
        FormInput: formInputStub,
        PrimaryButton: buttonStub,
        TertiaryButton: buttonStub,
        BIconArrowRepeat: { template: '<span />' },
      },
    },
  });
}

describe('SystemSecurityPlanCreateView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uuidv4.mockReset();
    createdSystemSecurityPlan.value = {
      uuid: 'created-ssp',
      metadata: {
        title: 'Created SSP',
      },
    } as SystemSecurityPlan;
    mocks.uuidv4
      .mockReturnValueOnce('generated-uuid-1')
      .mockReturnValueOnce('generated-uuid-2');
    mocks.createSystemSecurityPlan.mockResolvedValue({});
  });

  it('configures the SSP create request with decamelized POST data', () => {
    mountView();

    expect(useDataApi).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans',
      {
        method: 'POST',
        transformRequest: [mocks.decamelizeKeys],
      },
      { immediate: false },
    );
  });

  it('generates and regenerates the SSP UUID', async () => {
    const wrapper = mountView();
    const uuidInput = wrapper.findAll('input')[0];

    expect((uuidInput.element as HTMLInputElement).value).toBe(
      'generated-uuid-1',
    );

    await wrapper.find('button[type="button"]').trigger('click');

    expect((uuidInput.element as HTMLInputElement).value).toBe(
      'generated-uuid-2',
    );
  });

  it('creates the SSP and redirects to the editor', async () => {
    const wrapper = mountView();
    const titleInput = wrapper.findAll('input')[1];

    await titleInput.setValue('New SSP');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mocks.createSystemSecurityPlan).toHaveBeenCalledWith({
      data: {
        uuid: 'generated-uuid-1',
        metadata: {
          title: 'New SSP',
        },
      },
    });
    expect(mocks.push).toHaveBeenCalledWith({
      name: 'system-security-plan-editor',
      params: { id: 'created-ssp' },
    });
  });

  it('disables inputs and prevents duplicate create requests while submitting', async () => {
    let resolveCreate: (value: unknown) => void;
    mocks.createSystemSecurityPlan.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const wrapper = mountView();

    await wrapper.findAll('input')[1].setValue('New SSP');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');

    expect(mocks.createSystemSecurityPlan).toHaveBeenCalledTimes(1);
    expect(
      wrapper
        .findAll('input')
        .every((input) => input.attributes('disabled') !== undefined),
    ).toBe(true);
    expect(
      wrapper
        .findAll('button')
        .every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true);

    resolveCreate!({});
    await flushPromises();

    expect(
      wrapper
        .findAll('input')
        .every((input) => input.attributes('disabled') === undefined),
    ).toBe(true);
    expect(
      wrapper
        .findAll('button')
        .every((button) => button.attributes('disabled') === undefined),
    ).toBe(true);
  });

  it('shows an error and skips redirect when the create response has no UUID', async () => {
    const wrapper = mountView();
    createdSystemSecurityPlan.value = {
      metadata: {
        title: 'Created SSP',
      },
    } as SystemSecurityPlan;

    await wrapper.findAll('input')[1].setValue('New SSP');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mocks.toastAdd).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error creating system security plan',
      detail: 'Creation succeeded but no plan ID was returned.',
      life: 3000,
    });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('shows the API validation error when creation fails', async () => {
    const wrapper = mountView();
    mocks.createSystemSecurityPlan.mockRejectedValueOnce({
      response: {
        data: {
          errors: {
            body: 'Title is required',
          },
        },
      },
    });

    await wrapper.findAll('input')[1].setValue('New SSP');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error creating system security plan',
        detail: expect.stringContaining('Title is required'),
      }),
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
