import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue';
import type { ByComponent, SystemSecurityPlan } from '@/oscal';

const activePlan = ref<Pick<SystemSecurityPlan, 'uuid'> | null>(null);
const execute = vi.fn(async () => ({
  data: { value: { data: { uuid: 'component-1', title: 'Component One' } } },
}));

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: { securityPlan: activePlan.value },
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(undefined),
    execute,
    isLoading: ref(false),
    error: ref(null),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: vi.fn(),
  }),
}));

const stubs = {
  BurgerMenu: {
    props: ['items'],
    template:
      '<div><button v-for="item in items" :key="item.label" @click="item.command()">{{ item.label }}</button></div>',
  },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  RiskIndicatorBadge: {
    template: '<span />',
  },
  VueMarkdown: {
    props: ['source'],
    template: '<span>{{ source }}</span>',
  },
  'secondary-button': {
    template: '<button><slot /></button>',
  },
  'primary-button': {
    template: '<button><slot /></button>',
  },
};

const byComponent = {
  uuid: 'by-component-1',
  componentUuid: 'component-1',
  description: 'Implemented by component',
} as ByComponent;

describe('control implementation StatementByComponent', () => {
  beforeEach(() => {
    activePlan.value = null;
    vi.clearAllMocks();
  });

  it('does not fetch a component without an active security plan uuid', () => {
    mount(StatementByComponent, {
      props: {
        byComponent,
      },
      global: { stubs },
    });

    expect(execute).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalledWith(
      expect.stringContaining('undefined'),
    );
  });

  it('discards inline edit changes on cancel without mutating the byComponent prop', async () => {
    activePlan.value = { uuid: 'ssp-1' };
    const editableByComponent = {
      uuid: 'by-component-1',
      componentUuid: 'component-1',
      description: 'Original description',
      implementationStatus: {
        state: 'implemented',
        remarks: 'Original remarks',
      },
    } as ByComponent;

    const wrapper = mount(StatementByComponent, {
      props: {
        byComponent: editableByComponent,
      },
      global: { stubs },
    });

    await wrapper.find('button').trigger('click');
    await wrapper.find('textarea').setValue('Unsaved description');
    await wrapper.find('select').setValue('planned');
    await wrapper.findAll('textarea')[1].setValue('Unsaved remarks');
    const cancelButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel');
    expect(cancelButton).toBeDefined();
    await cancelButton?.trigger('click');

    expect(editableByComponent).toEqual({
      uuid: 'by-component-1',
      componentUuid: 'component-1',
      description: 'Original description',
      implementationStatus: {
        state: 'implemented',
        remarks: 'Original remarks',
      },
    });
    expect(wrapper.emitted('save')).toBeUndefined();
  });
});
