import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { SystemCharacteristics } from '@/oscal';
import SystemSecurityPlanCharacteristicsView from '@/views/system-security-plans/SystemSecurityPlanCharacteristicsView.vue';

const characteristics = ref<SystemCharacteristics>({
  systemName: 'Original System',
  description: 'Original description',
} as SystemCharacteristics);
const toastAdd = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'ssp-1' },
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: string | null) => {
    if (
      url === '/api/oscal/system-security-plans/ssp-1/system-characteristics'
    ) {
      return {
        data: characteristics,
        isLoading: ref(false),
        error: ref(null),
      };
    }

    if (url?.includes('/system-characteristics/')) {
      return {
        data: ref(null),
        isLoading: ref(false),
      };
    }

    throw new Error(`Unexpected useDataApi call: ${url}`);
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
  }),
}));

const stubs = {
  TooltipTitle: {
    props: ['text'],
    template: '<h1>{{ text }}</h1>',
  },
  SecondaryButton: {
    template:
      '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /></div>',
  },
  SystemCharacteristicsForm: {
    name: 'SystemCharacteristicsForm',
    emits: ['updated'],
    template: '<form data-testid="characteristics-form" />',
  },
};

describe('SystemSecurityPlanCharacteristicsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    characteristics.value = {
      systemName: 'Original System',
      description: 'Original description',
    } as SystemCharacteristics;
  });

  it('opens the existing characteristics form and applies its update', async () => {
    const wrapper = mount(SystemSecurityPlanCharacteristicsView, {
      global: { stubs },
    });

    expect(
      wrapper.findComponent({ name: 'SystemCharacteristicsForm' }).exists(),
    ).toBe(false);

    await wrapper.get('button').trigger('click');

    const form = wrapper.findComponent({ name: 'SystemCharacteristicsForm' });
    expect(form.exists()).toBe(true);

    form.vm.$emit('updated', {
      systemName: 'Updated System',
      description: 'Updated description',
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Updated System');
    expect(
      wrapper.findComponent({ name: 'SystemCharacteristicsForm' }).exists(),
    ).toBe(false);
  });

  it('keeps displayed characteristics when the dialog form emits an empty failure payload', async () => {
    const wrapper = mount(SystemSecurityPlanCharacteristicsView, {
      global: { stubs },
    });

    await wrapper.get('button').trigger('click');

    const form = wrapper.findComponent({ name: 'SystemCharacteristicsForm' });
    expect(form.exists()).toBe(true);

    form.vm.$emit('updated', {});

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Original System');
    expect(wrapper.text()).toContain('Original description');
    expect(
      wrapper.findComponent({ name: 'SystemCharacteristicsForm' }).exists(),
    ).toBe(false);
    expect(toastAdd).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load or save system characteristics.',
      life: 3000,
    });
  });
});
