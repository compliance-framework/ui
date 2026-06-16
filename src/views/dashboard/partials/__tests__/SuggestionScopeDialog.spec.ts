import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuggestionScopeDialog from '../SuggestionScopeDialog.vue';
import type { DashboardSuggestionLabelSet } from '../dashboard-suggestions';

const state = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  preview: {
    plannedCalls: undefined as number | undefined,
    controlCount: undefined as number | undefined,
    labelSetCount: undefined as number | undefined,
  },
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: state.axiosPost }),
}));

function makeLabelSet(hash: string): DashboardSuggestionLabelSet {
  return {
    hash,
    labels: { env: hash },
    evidenceCount: 2,
  };
}

function mountDialog(props = {}) {
  return mount(SuggestionScopeDialog, {
    props: {
      visible: true,
      sspId: 'ssp-1',
      controls: [
        {
          label: 'AC-1 - Access control policy',
          value: 'AC-1',
          controlId: 'AC-1',
          title: 'Access control policy',
          catalogTitle: 'NIST SP 800-53 Rev 5',
          profileTitles: ['Moderate Baseline'],
        },
        { label: 'AC-2', value: 'AC-2' },
      ],
      labelSets: [makeLabelSet('hash-1'), makeLabelSet('hash-2')],
      ...props,
    },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Chip: { props: ['label'], template: '<span>{{ label }}</span>' },
        Message: { template: '<div><slot /></div>' },
        MultiSelect: {
          name: 'MultiSelect',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue'],
          emits: ['update:modelValue'],
          template:
            '<div><div v-for="option in options" :key="option[optionValue]"><slot name="option" :option="option">{{ option[optionLabel] }}</slot></div></div>',
        },
        Checkbox: {
          name: 'Checkbox',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', true)" />',
        },
        PrimaryButton: {
          props: ['disabled'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
}

async function flushPreview() {
  await flushPromises();
  await vi.runOnlyPendingTimersAsync();
  await flushPromises();
}

describe('SuggestionScopeDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    state.preview = {
      plannedCalls: undefined,
      controlCount: undefined,
      labelSetCount: undefined,
    };
    state.axiosPost.mockImplementation(async (_url: string, body: unknown) => {
      const scope = (
        body as {
          scope?: { controlKeys?: string[]; labelSetHashes?: string[] };
        }
      )?.scope;
      const controlCount =
        state.preview.controlCount ?? scope?.controlKeys?.length ?? 2;
      const labelSetCount =
        state.preview.labelSetCount ?? scope?.labelSetHashes?.length ?? 2;
      return {
        data: {
          data: {
            plannedCalls:
              state.preview.plannedCalls ?? controlCount * labelSetCount,
            controlCount,
            labelSetCount,
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the live cost preview when scope selections change', async () => {
    const wrapper = mountDialog();
    await flushPreview();
    expect(wrapper.text()).toContain('4 AI calls covering 2 controls x 2');

    await wrapper
      .findAllComponents({ name: 'MultiSelect' })[0]
      .vm.$emit('update:modelValue', ['AC-1']);
    await flushPreview();

    expect(wrapper.text()).toContain('2 AI calls covering 1 controls x 2');
  });

  it('requires explicit confirmation for larger grids', async () => {
    state.preview = {
      plannedCalls: 30,
      controlCount: 6,
      labelSetCount: 5,
    };
    const wrapper = mountDialog({
      controls: Array.from({ length: 6 }, (_, index) => ({
        label: `AC-${index}`,
        value: `AC-${index}`,
      })),
      labelSets: Array.from({ length: 5 }, (_, index) =>
        makeLabelSet(`hash-${index}`),
      ),
    });
    await flushPreview();

    expect(wrapper.text()).toContain('This will make 30 AI calls');
    expect(
      wrapper.find('[data-testid="scope-generate"]').attributes('disabled'),
    ).toBeDefined();

    await wrapper
      .findAllComponents({ name: 'Checkbox' })[1]
      .vm.$emit('update:modelValue', true);
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');

    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: undefined,
      },
    ]);
  });

  it('surfaces the configured ceiling inline and blocks submission', async () => {
    const wrapper = mountDialog({ ceilingError: 'Maximum is 10 calls' });
    await flushPreview();

    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'Maximum is 10 calls',
    );
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')).toBeUndefined();
  });

  it('emits scope-change when the selected scope changes', async () => {
    const wrapper = mountDialog({ ceilingError: 'Maximum is 10 calls' });
    await flushPreview();

    await wrapper
      .findAllComponents({ name: 'MultiSelect' })[0]
      .vm.$emit('update:modelValue', ['AC-1']);

    expect(wrapper.emitted('scope-change')).toBeTruthy();
  });

  it('renders controls with catalog and profile metadata in dropdown options', () => {
    const wrapper = mountDialog();
    const controlSelector = wrapper.findAllComponents({
      name: 'MultiSelect',
    })[0];

    expect(controlSelector.text()).toContain('AC-1 - Access control policy');
    expect(controlSelector.text()).toContain('NIST SP 800-53 Rev 5');
    expect(controlSelector.text()).toContain('Moderate Baseline');
  });

  it('clears the pending preview timer on unmount', async () => {
    const wrapper = mountDialog();

    wrapper.unmount();
    await vi.runOnlyPendingTimersAsync();

    expect(state.axiosPost).not.toHaveBeenCalled();
  });

  it('uses preview planned calls for large-run confirmation instead of local cartesian size', async () => {
    state.preview = {
      plannedCalls: 1,
      controlCount: 16,
      labelSetCount: 89,
    };
    const wrapper = mountDialog({
      controls: Array.from({ length: 16 }, (_, index) => ({
        label: `AC-${index}`,
        value: `AC-${index}`,
      })),
      labelSets: Array.from({ length: 89 }, (_, index) =>
        makeLabelSet(`hash-${index}`),
      ),
    });
    await flushPreview();

    expect(wrapper.text()).toContain('1 AI calls covering 16 controls x 89');
    expect(wrapper.find('[data-testid="scope-confirm-large"]').exists()).toBe(
      false,
    );

    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: undefined,
      },
    ]);
  });

  it('blocks generation when preview returns an empty resolved scope', async () => {
    state.axiosPost.mockRejectedValueOnce({ response: { status: 422 } });
    const wrapper = mountDialog();
    await flushPreview();

    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'The selected scope does not include any controls or label sets.',
    );
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')).toBeUndefined();
  });

  it('shows human label-set titles instead of selected hash labels', () => {
    const wrapper = mountDialog({
      labelSets: [
        {
          hash: 'opaque-hash',
          labels: { env: 'prod', service: 'payments' },
          evidenceCount: 2,
          sampleTitles: ['Payment evidence'],
        },
        {
          hash: 'fallback-hash',
          labels: { env: 'stage' },
          evidenceCount: 1,
        },
      ],
    });

    const labelSetSelector = wrapper.findAllComponents({
      name: 'MultiSelect',
    })[1];
    const labelSetOptions = labelSetSelector.props('options') as Array<{
      title: string;
    }>;

    expect(labelSetOptions.map((option) => option.title)).toEqual([
      'Payment evidence',
      'env=stage',
    ]);
    expect(labelSetSelector.text()).toContain('Payment evidence');
    expect(labelSetSelector.text()).toContain('env=prod');
    expect(labelSetSelector.text()).toContain('2 evidence');
  });
});
