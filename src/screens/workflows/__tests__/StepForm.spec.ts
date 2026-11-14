import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import type { StepDefinition } from '@/types/workflows';
import StepForm from '../StepForm.vue';

const steps = vi.hoisted(() => ({ createStep: vi.fn(), updateStep: vi.fn() }));
vi.mock('@/composables/workflows', () => ({
  useWorkflowStepDefinitions: () => steps,
}));

const existing = [
  {
    id: 's-1',
    name: 'Export report',
    order: 1,
    responsibleRole: 'IAM Administrator',
  },
  { id: 's-2', name: 'Review', order: 2 },
] as StepDefinition[];

function mountForm(step?: StepDefinition) {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(StepForm, {
            workflowDefinitionId: 'def-1',
            availableSteps: existing,
            step,
          }),
        ),
    }),
    { attachTo: document.body },
  );
}

describe('StepForm', () => {
  beforeEach(() => {
    steps.createStep
      .mockReset()
      .mockImplementation(async (_data, done) => done({ id: 's-3' }));
    steps.updateStep.mockReset();
  });

  it('asks for a name, then creates the step after the existing ones', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Step name is required');
    expect(steps.createStep).not.toHaveBeenCalled();

    await wrapper.find('input').setValue('Revoke access');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(steps.createStep).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowDefinitionId: 'def-1',
        name: 'Revoke access',
        order: 3,
        dependsOn: [],
        evidenceRequired: [
          { type: 'document', description: '', required: true },
        ],
      }),
      expect.any(Function),
    );
    expect(wrapper.findComponent(StepForm).emitted('saved')).toHaveLength(1);
    wrapper.unmount();
  });

  it('offers every other step as a dependency, and no duration field', () => {
    const wrapper = mountForm(existing[1]);
    const options = wrapper.findComponent(CheckboxGroup).props('options') as {
      value: string;
    }[];
    expect(options.map((o) => o.value)).toEqual(['s-1']);
    expect(wrapper.text()).not.toMatch(/duration/i);
    wrapper.unmount();
  });
});
