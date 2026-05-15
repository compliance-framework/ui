import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EvidenceSubmissionForm from '../EvidenceSubmissionForm.vue';
import type { StepExecution } from '@/types/workflows';

const step = {
  id: 'step-1',
  status: 'in_progress',
  workflowExecutionId: 'exec-1',
  workflowStepDefinitionId: 'def-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as StepExecution;

function mountComponent(evidenceRequirements: string[] = []) {
  return mount(EvidenceSubmissionForm, {
    props: {
      step,
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
          template: '<button :disabled="disabled"><slot /></button>',
        },
        Message: { template: '<div role="alert"><slot /></div>' },
      },
    },
  });
}

async function selectEvidenceType(
  wrapper: ReturnType<typeof mountComponent>,
  type: string,
) {
  await wrapper.find('select').setValue(type);
}

async function uploadFiles(
  wrapper: ReturnType<typeof mountComponent>,
  files: File[],
) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: files,
  });
  await input.trigger('change');
}

describe('EvidenceSubmissionForm file validation', () => {
  it('uses image-only accept values for screenshot evidence', async () => {
    const wrapper = mountComponent(['screenshot', 'document']);

    await selectEvidenceType(wrapper, 'screenshot');

    expect(wrapper.find('input[type="file"]').attributes('accept')).toBe(
      '.png,.jpg,.jpeg,.gif,.webp',
    );
    expect(wrapper.text()).toContain('Supported: PNG, JPG, JPEG, GIF, WebP');
  });

  it('keeps document evidence support for documents and images', async () => {
    const wrapper = mountComponent(['document']);

    await selectEvidenceType(wrapper, 'document');

    expect(wrapper.find('input[type="file"]').attributes('accept')).toBe(
      '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp',
    );
    expect(wrapper.text()).toContain('Supported: PDF, Word, Images');
  });

  it('rejects document files selected for screenshot evidence', async () => {
    const wrapper = mountComponent(['screenshot']);

    await selectEvidenceType(wrapper, 'screenshot');
    await uploadFiles(wrapper, [
      new File(['content'], 'evidence.pdf', { type: 'application/pdf' }),
    ]);

    expect(wrapper.text()).toContain(
      'not supported for screenshot evidence: evidence.pdf',
    );
    expect(wrapper.emitted('evidence-submitted')).toBeUndefined();
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('accepts webp files for screenshot evidence', async () => {
    const wrapper = mountComponent(['screenshot']);

    await selectEvidenceType(wrapper, 'screenshot');
    await uploadFiles(wrapper, [
      new File(['content'], 'evidence.webp', { type: 'image/webp' }),
    ]);

    expect(wrapper.text()).toContain('1 file(s) selected');
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
  });
});
