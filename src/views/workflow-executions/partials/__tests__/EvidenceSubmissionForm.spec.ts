import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EvidenceSubmissionForm from '../EvidenceSubmissionForm.vue';
import type { EvidenceRequirement, StepExecution } from '@/types/workflows';

const step = {
  id: 'step-1',
  status: 'in_progress',
  evidence: [],
} as unknown as StepExecution;

const selectStub = {
  props: ['options', 'optionLabel', 'optionValue', 'modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template: `
    <div class="select-stub">
      <span
        v-for="(option, i) in options"
        :key="i"
        class="select-option"
      >{{ optionLabel ? option[optionLabel] : option }}</span>
    </div>
  `,
};

const stubs = {
  Select: selectStub,
  Label: { template: '<label><slot /></label>' },
  Textarea: { template: '<textarea />' },
  InputText: { template: '<input />' },
  PrimaryButton: { template: '<button><slot /></button>' },
  Message: { template: '<div><slot /></div>' },
};

describe('EvidenceSubmissionForm', () => {
  it('displays description from EvidenceRequirement objects in the type selector', () => {
    const requirements: EvidenceRequirement[] = [
      {
        type: 'document',
        required: true,
        description: 'Upload policy document',
      },
      {
        type: 'attestation',
        required: false,
        description: 'Sign off attestation',
      },
    ];

    const wrapper = mount(EvidenceSubmissionForm, {
      props: { step, evidenceRequirements: requirements },
      global: { stubs },
    });

    const optionTexts = wrapper
      .findAll('.select-option')
      .map((o) => o.text().trim());

    expect(optionTexts).toContain('Upload policy document');
    expect(optionTexts).toContain('Sign off attestation');
  });

  it('falls back to the type name when a requirement has no description', () => {
    const requirements: EvidenceRequirement[] = [
      { type: 'screenshot', required: true },
    ];

    const wrapper = mount(EvidenceSubmissionForm, {
      props: { step, evidenceRequirements: requirements },
      global: { stubs },
    });

    const optionTexts = wrapper
      .findAll('.select-option')
      .map((o) => o.text().trim());

    expect(optionTexts).toContain('screenshot');
  });
});
