import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import StatementByComponent from '@/views/system-security-plans/partials/StatementByComponent.vue';
import type { ByComponent, SystemSecurityPlan } from '@/oscal';

const execute = vi.fn(async () => ({
  data: { value: { data: { uuid: 'component-1', title: 'Component One' } } },
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

// PermissionGate (behind the new "Edit Shared Responsibility" affordance) reads the
// permissions store; stubbing the composable keeps this partial's tests Pinia-free.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => true,
    permissionTooltip: () => '',
  }),
}));

const stubs = {
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
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

// The inline description/status edit lives in the burger menu; the first button on the row is
// now "Edit Shared Responsibility", which opens the statement-level editors instead.
async function clickInlineEdit(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((b) => b.text() === 'Edit');
  if (!button) throw new Error('Inline "Edit" button not found');
  await button.trigger('click');
}

const byComponent = {
  uuid: 'by-component-1',
  componentUuid: 'component-1',
  description: 'Implemented by component',
} as ByComponent;

describe('StatementByComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the component from the loaded SSP when props are ready on mount', () => {
    mount(StatementByComponent, {
      props: {
        ssp: { uuid: 'ssp-1' } as SystemSecurityPlan,
        byComponent,
      },
      global: { stubs },
    });

    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/components/component-1',
    );
  });

  it('does not fetch a component until the SSP uuid is available', async () => {
    const wrapper = mount(StatementByComponent, {
      props: {
        ssp: {} as SystemSecurityPlan,
        byComponent,
      },
      global: { stubs },
    });

    expect(execute).not.toHaveBeenCalled();

    await wrapper.setProps({
      ssp: { uuid: 'ssp-1' } as SystemSecurityPlan,
    });

    expect(execute).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/components/component-1',
    );
    expect(execute).not.toHaveBeenCalledWith(
      expect.stringContaining('undefined'),
    );
  });

  it('discards inline edit changes on cancel without mutating the byComponent prop', async () => {
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
        ssp: { uuid: 'ssp-1' } as SystemSecurityPlan,
        byComponent: editableByComponent,
      },
      global: { stubs },
    });

    await clickInlineEdit(wrapper);
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

  it('shows persisted prop data after save when the parent does not update the prop', async () => {
    const editableByComponent = {
      uuid: 'by-component-1',
      componentUuid: 'component-1',
      description: 'Persisted description',
    } as ByComponent;

    const wrapper = mount(StatementByComponent, {
      props: {
        ssp: { uuid: 'ssp-1' } as SystemSecurityPlan,
        byComponent: editableByComponent,
      },
      global: { stubs },
    });

    await clickInlineEdit(wrapper);
    await wrapper.find('textarea').setValue('Draft description');
    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save');
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');

    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(wrapper.text()).toContain('Persisted description');
    expect(wrapper.text()).not.toContain('Draft description');
    expect(editableByComponent.description).toBe('Persisted description');
  });
});
