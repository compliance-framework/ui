import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EvidenceSubmissionForm from '../EvidenceSubmissionForm.vue';
import type { StepExecution } from '@/types/workflows';

function createStep(): StepExecution {
  return {
    id: 'step-1',
    status: 'in_progress',
    workflowExecutionId: 'exec-1',
    workflowStepDefinitionId: 'def-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mountComponent(evidenceRequirements: string[] = []) {
  return mount(EvidenceSubmissionForm, {
    props: {
      step: createStep(),
      evidenceRequirements,
    },
    global: {
      stubs: {
        Label: { template: '<label><slot /></label>' },
        Select: {
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="option in options" :key="option" :value="option">{{ option }}</option></select>',
        },
        InputText: { template: '<input />' },
        Textarea: { template: '<textarea />' },
        PrimaryButton: {
          props: ['disabled'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        Message: { template: '<div role="alert"><slot /></div>' },
      },
    },
  });
}

async function selectEvidenceType(
  wrapper: ReturnType<typeof mountComponent>,
  evidenceType: string,
) {
  await wrapper.find('select').setValue(evidenceType);
}

async function chooseFiles(
  wrapper: ReturnType<typeof mountComponent>,
  files: File[],
) {
  const input = wrapper.find<HTMLInputElement>('#file');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
}

describe('EvidenceSubmissionForm file type validation', () => {
  it('limits screenshot uploads to image file extensions', async () => {
    const wrapper = mountComponent(['screenshot']);

    await selectEvidenceType(wrapper, 'screenshot');

    const input = wrapper.find('#file');
    expect(input.attributes('accept')).toBe('.png,.jpg,.jpeg,.gif,.webp');
    expect(wrapper.text()).toContain('Supported: PNG, JPG, JPEG, GIF, WEBP');

    await chooseFiles(wrapper, [
      new File(['document'], 'invalid.pdf', { type: 'application/pdf' }),
    ]);

    expect(wrapper.text()).toContain(
      'The following files are not supported for screenshot evidence: invalid.pdf',
    );
    expect(wrapper.emitted('evidence-submitted')).toBeUndefined();
  });

  it('keeps document evidence support for document and image extensions', async () => {
    const wrapper = mountComponent(['document']);

    await selectEvidenceType(wrapper, 'document');

    expect(wrapper.find('#file').attributes('accept')).toBe(
      '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp',
    );

    await chooseFiles(wrapper, [
      new File(['document'], 'valid.pdf', { type: 'application/pdf' }),
    ]);

    expect(wrapper.text()).toContain('1 file(s) selected');
    expect(wrapper.text()).not.toContain('not supported');
  });
});
