import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CreateByComponentForm from '../CreateByComponentForm.vue';
import DashboardLinkForm from '../DashboardLinkForm.vue';
import EvidenceDashboardForm from '../EvidenceDashboardForm.vue';
import type { Dashboard } from '@/stores/filters';

const stubs = {
  Label: {
    template: '<label><slot /></label>',
  },
  InputText: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Select: {
    props: ['modelValue', 'options', 'optionValue', 'optionLabel'],
    emits: ['update:modelValue'],
    template: '<select></select>',
  },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Message: {
    template: '<div><slot /></div>',
  },
  Button: {
    template: '<button type="button"><slot />{{ label }}</button>',
    props: ['label'],
  },
  PrimaryButton: {
    template: '<button><slot /></button>',
  },
  SecondaryButton: {
    template: '<button type="button"><slot /></button>',
  },
};

describe('control statement extracted forms', () => {
  const dashboard = {
    id: '1',
    name: 'Dashboard',
    filter: { scope: {} },
  } as unknown as Dashboard;

  it('blocks component submit until a component is selected', async () => {
    const wrapper = mount(CreateByComponentForm, {
      props: {
        selectedComponent: null,
        description: '',
        statusState: '',
        statusRemarks: '',
        componentItems: [{ name: 'Component One', value: 'component-1' }],
        statusOptions: [{ label: 'No status', value: '' }],
        componentsLoading: false,
      },
      global: { stubs },
    });

    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Please select a valid component.');
  });

  it('emits component submit when valid, emits cancel without submit, and renders server errors', async () => {
    const wrapper = mount(CreateByComponentForm, {
      props: {
        selectedComponent: { name: 'Component One', value: 'component-1' },
        description: '',
        statusState: '',
        statusRemarks: '',
        componentItems: [{ name: 'Component One', value: 'component-1' }],
        statusOptions: [{ label: 'No status', value: '' }],
        componentsLoading: false,
        serverError: 'Create failed',
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Create failed');
    await wrapper.find('form').trigger('submit');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');

    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('blocks dashboard linking until a dashboard is selected', async () => {
    const wrapper = mount(DashboardLinkForm, {
      props: {
        selectedDashboard: null,
        dashboards: [dashboard],
      },
      global: { stubs },
    });

    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Please select a dashboard.');
  });

  it('emits dashboard link submit when valid and displays server errors', async () => {
    const wrapper = mount(DashboardLinkForm, {
      props: {
        selectedDashboard: dashboard,
        dashboards: [dashboard],
        serverError: 'Link failed',
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Link failed');
    await wrapper.find('form').trigger('submit');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');

    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('blocks evidence dashboard creation without a name', async () => {
    const wrapper = mount(EvidenceDashboardForm, {
      props: {
        name: '',
        selectedBaselineEvidence: null,
        newLabelName: '',
        newLabelValue: '',
        uniqueEvidenceTitles: [],
        evidenceLoading: false,
        labelConditions: [],
        availableLabelNames: [],
        availableLabelValues: [],
        computedFilter: 'policy=demo',
      },
      global: { stubs },
    });

    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Dashboard name is required.');
  });

  it('emits evidence dashboard submit when valid and renders server errors', async () => {
    const wrapper = mount(EvidenceDashboardForm, {
      props: {
        name: 'Evidence Dashboard',
        selectedBaselineEvidence: null,
        newLabelName: '',
        newLabelValue: '',
        uniqueEvidenceTitles: [],
        evidenceLoading: false,
        labelConditions: [],
        availableLabelNames: [],
        availableLabelValues: [],
        computedFilter: 'policy=demo',
        serverError: 'Create dashboard failed',
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Create dashboard failed');
    await wrapper.find('form').trigger('submit');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');

    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
