import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { DashboardSuggestionLabelKey } from '@/views/dashboard/partials/dashboard-suggestions';
import SuggestionScopeForm from '../SuggestionScopeForm.vue';

const state = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  preview: {
    plannedCalls: undefined as number | undefined,
    controlCount: undefined as number | undefined,
    labelSetCount: undefined as number | undefined,
  },
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    post: state.axiosPost,
    get: vi.fn(async () => ({ data: { data: [] } })),
  }),
  decamelizeKeys: (data: unknown) => data,
}));
// The condition fields are tested on their own; here they only pass rows up.
vi.mock('@/screens/configure/LabelConditionFields.vue', () => ({
  default: {
    name: 'LabelConditionFields',
    props: ['modelValue', 'sspId', 'keys', 'legend'],
    emits: ['update:modelValue'],
    template: '<div />',
  },
}));

const labelKeys: DashboardSuggestionLabelKey[] = [
  { key: 'env', values: ['prod', 'stage'] },
];
const twoControls = [
  {
    label: 'AC-1 - Access control policy',
    value: 'AC-1',
    controlId: 'AC-1',
    title: 'Access control policy',
    catalogTitle: 'NIST SP 800-53 Rev 5',
    profileTitles: ['Moderate Baseline'],
  },
  { label: 'AC-2', value: 'AC-2' },
];

function mountForm(props: Record<string, unknown> = {}) {
  const events: Record<string, unknown[][]> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      (events[name] ??= []).push(args);
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SuggestionScopeForm, {
            sspId: 'ssp-1',
            controls: twoControls,
            labelKeys,
            onGenerate: record('generate'),
            onScopeChange: record('scope-change'),
            ...props,
          }),
        ),
    }),
  );
  const form = () => wrapper.findComponent(SuggestionScopeForm);
  return { wrapper, form, events };
}

async function flushPreview() {
  await flushPromises();
  await vi.runOnlyPendingTimersAsync();
  await flushPromises();
}
const conditions = (wrapper: ReturnType<typeof mount>, index: number) =>
  wrapper.findAllComponents({ name: 'LabelConditionFields' })[index]!;
const setControls = async (form: () => { vm: unknown }, keys: string[]) => {
  (form().vm as { selectedControls: string[] }).selectedControls = keys;
  await flushPreview();
};

describe('SuggestionScopeForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    state.preview = {
      plannedCalls: undefined,
      controlCount: undefined,
      labelSetCount: undefined,
    };
    state.axiosPost.mockImplementation(async (_url: string, body: unknown) => {
      const scope = (body as { scope?: { controlKeys?: string[] } })?.scope;
      const controlCount =
        state.preview.controlCount ?? scope?.controlKeys?.length ?? 2;
      const labelSetCount = state.preview.labelSetCount ?? 2;
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
  afterEach(() => vi.useRealTimers());

  it('updates the estimate when the controls change, sent kebab-cased', async () => {
    const { wrapper, form } = mountForm();
    await flushPreview();
    expect(wrapper.text()).toContain('4 AI calls, covering 2 controls × 2');
    await setControls(form, ['AC-1']);
    expect(wrapper.text()).toContain('2 AI calls, covering 1 controls × 2');
    const last = state.axiosPost.mock.calls.at(-1);
    expect(last?.[1]).toMatchObject({ scope: { controlKeys: ['AC-1'] } });
    expect(last?.[2]?.transformRequest).toBeDefined();
  });

  it('lists chosen controls with their catalog once "All controls" is off', async () => {
    const { wrapper, form } = mountForm();
    await flushPreview();
    await setControls(form, ['AC-1']);
    expect(wrapper.text()).toContain(
      'AC-1 - Access control policy (NIST SP 800-53 Rev 5)',
    );
  });

  it('builds an evidence label filter from conditions', async () => {
    const { wrapper, events } = mountForm();
    await flushPreview();
    conditions(wrapper, 0).vm.$emit('update:modelValue', [
      { key: 'repository', value: 'todo-app' },
    ]);
    await flushPreview();
    await wrapper.find('form').trigger('submit');
    expect(events.generate?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: {
          labelFilter: {
            scope: {
              condition: {
                label: 'repository',
                operator: '=',
                value: 'todo-app',
              },
            },
          },
        },
        constraints: undefined,
      },
    ]);
  });

  it('asks to confirm a large run', async () => {
    state.preview = { plannedCalls: 30, controlCount: 6, labelSetCount: 5 };
    const { wrapper, events } = mountForm();
    await flushPreview();
    expect(wrapper.text()).toContain('This makes 30 AI calls');
    expect(
      wrapper
        .find('[data-testid="scope-generate"]')
        .attributes('aria-disabled'),
    ).toBe('true');
    const confirm = wrapper
      .findAll('label')
      .find((l) => l.text() === 'Confirm this larger run')!;
    await wrapper.find(`[id="${confirm.attributes('for')}"]`).setValue(true);
    await wrapper.find('form').trigger('submit');
    expect(events.generate?.at(-1)).toEqual([
      { supersedePending: true, scope: undefined, constraints: undefined },
    ]);
  });

  it('sends constraints and the preset', async () => {
    const { wrapper, events } = mountForm();
    await flushPreview();
    const preset = wrapper
      .findAll('select')
      .find((s) =>
        s.findAll('option').some((o) => o.attributes('value') === 'new_filter'),
      )!;
    await preset.setValue('new_filter');
    conditions(wrapper, 1).vm.$emit('update:modelValue', [
      { key: 'env', value: 'prod' },
    ]);
    conditions(wrapper, 2).vm.$emit('update:modelValue', [
      { key: 'repository', value: '' },
    ]);
    await flushPreview();
    await wrapper.find('form').trigger('submit');
    expect(events.generate?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: undefined,
        constraints: {
          onlyAction: 'new_filter',
          mandatoryLabels: [{ key: 'env', value: 'prod' }],
          excludedLabels: [{ key: 'repository', value: null }],
        },
      },
    ]);
  });

  it('shows the configured ceiling and blocks generating', async () => {
    const { wrapper, events } = mountForm({
      ceilingError: 'Maximum is 10 calls',
    });
    await flushPreview();
    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'Maximum is 10 calls',
    );
    await wrapper.find('form').trigger('submit');
    expect(events.generate).toBeUndefined();
  });

  it('says when the scope changes', async () => {
    const { form, events } = mountForm();
    await flushPreview();
    await setControls(form, ['AC-1']);
    expect(events['scope-change']).toBeTruthy();
  });

  it('clears the pending estimate timer on unmount', async () => {
    const { wrapper } = mountForm();
    wrapper.unmount();
    await vi.runOnlyPendingTimersAsync();
    expect(state.axiosPost).not.toHaveBeenCalled();
  });

  it("trusts the estimate's call count over controls × label sets", async () => {
    state.preview = { plannedCalls: 1, controlCount: 16, labelSetCount: 89 };
    const { wrapper } = mountForm();
    await flushPreview();
    expect(wrapper.text()).toContain('1 AI calls, covering 16 controls × 89');
    expect(wrapper.find('[data-testid="scope-confirm-large"]').exists()).toBe(
      false,
    );
  });

  it('blocks generating when the scope resolves to nothing', async () => {
    state.axiosPost.mockRejectedValueOnce({ response: { status: 422 } });
    const { wrapper, events } = mountForm();
    await flushPreview();
    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'The selected scope does not include any controls or label sets.',
    );
    await wrapper.find('form').trigger('submit');
    expect(events.generate).toBeUndefined();
  });
});
