import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import EvidenceSubmissionForm from '../EvidenceSubmissionForm.vue';
import type { EvidenceRequirement, StepExecution } from '@/types/workflows';

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

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

  // BCH-1150: file input accept attribute must be restricted to image types when evidence type is screenshot.
  // Observed: accept is static ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" regardless of evidence type.
  // Expected: accept only contains image extensions when type is screenshot.
  it('restricts file input to image types when evidence type is screenshot', async () => {
    const wrapper = mount(EvidenceSubmissionForm, {
      props: { step, evidenceRequirements: [] },
      global: { stubs },
    });

    // Set evidence type to screenshot via the internal form state
    const vm = wrapper.vm as unknown as { evidenceForm: { type: string } };
    vm.evidenceForm.type = 'screenshot';
    await nextTick();

    const fileInput = wrapper.find('input[type="file"]');
    const accept = fileInput.attributes('accept') ?? '';

    // Must contain image extensions
    expect(accept).toContain('.png');
    expect(accept).toContain('.jpg');
    // Must NOT contain document extensions
    expect(accept).not.toContain('.pdf');
    expect(accept).not.toContain('.doc');
  });

  // BCH-1150: file input accept attribute should include document extensions when type is document.
  it('allows document file types when evidence type is document', async () => {
    const wrapper = mount(EvidenceSubmissionForm, {
      props: { step, evidenceRequirements: [] },
      global: { stubs },
    });

    const vm = wrapper.vm as unknown as { evidenceForm: { type: string } };
    vm.evidenceForm.type = 'document';
    await nextTick();

    const fileInput = wrapper.find('input[type="file"]');
    const accept = fileInput.attributes('accept') ?? '';

    expect(accept).toContain('.pdf');
  });

  // BCH-1150: selecting a non-image file when evidence type is screenshot should show an error.
  // Observed: handleFileChange only validates file size, not type compatibility.
  // Expected: an error message is shown when a PDF is selected for screenshot evidence.
  it('shows an error when a non-image file is selected for screenshot evidence', async () => {
    const wrapper = mount(EvidenceSubmissionForm, {
      props: { step, evidenceRequirements: [] },
      global: { stubs },
    });

    const vm = wrapper.vm as unknown as {
      evidenceForm: { type: string };
      handleFileChange: (e: Event) => void;
      submitError: string;
    };

    vm.evidenceForm.type = 'screenshot';
    await nextTick();

    const pdfFile = new File(['content'], 'report.pdf', {
      type: 'application/pdf',
    });
    const input = wrapper.find('input[type="file"]')
      .element as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [pdfFile],
      configurable: true,
    });
    await wrapper.find('input[type="file"]').trigger('change');

    expect(vm.submitError).toBeTruthy();
    expect(vm.submitError).toContain('screenshot');
  });
});
