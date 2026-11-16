import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import SystemCharacteristicsForm from '../SystemCharacteristicsForm.vue';

const state = vi.hoisted(() => ({
  getCharacteristics: vi.fn(),
  updateCharacteristics: vi.fn(),
}));

vi.mock('@/stores/system-security-plans.ts', () => ({
  useSystemSecurityPlanStore: () => state,
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

const stubs = { Tooltip: { template: '<slot />' } };

function mountForm() {
  return mount(SystemCharacteristicsForm, {
    props: { systemSecurityPlanId: 'ssp-1' },
    global: { plugins: [createPinia()], stubs },
  });
}

function field(wrapper: ReturnType<typeof mountForm>, label: string) {
  const labelEl = wrapper
    .findAll('label')
    .find((l) => l.text().trim() === label);
  return wrapper.find(`[id="${labelEl!.attributes('for')}"]`);
}

describe('SystemCharacteristicsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getCharacteristics.mockResolvedValue({
      data: { systemName: 'Payments', description: 'Moves money' },
    });
    state.updateCharacteristics.mockResolvedValue({});
  });

  it('loads the characteristics and saves the edited record', async () => {
    const wrapper = mountForm();
    await flushPromises();

    expect(state.getCharacteristics).toHaveBeenCalledWith('ssp-1');
    expect(
      (field(wrapper, 'System name').element as HTMLInputElement).value,
    ).toBe('Payments');

    await field(wrapper, 'Short name').setValue('PAY');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(state.updateCharacteristics).toHaveBeenCalledWith(
      'ssp-1',
      expect.objectContaining({
        systemName: 'Payments',
        systemNameShort: 'PAY',
      }),
    );
    expect(wrapper.emitted('updated')?.[0][0]).toMatchObject({
      systemNameShort: 'PAY',
    });
  });

  it('shows a save error inline and stays open', async () => {
    state.updateCharacteristics.mockRejectedValue(new Error('Server said no'));
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Not saved');
    expect(wrapper.emitted('updated')).toBeUndefined();
  });

  it('reports a failed load to the parent', async () => {
    state.getCharacteristics.mockRejectedValue(new Error('nope'));
    const wrapper = mountForm();
    await flushPromises();

    expect(wrapper.emitted('updated')?.[0]).toEqual([{}]);
  });
});
