import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import EvidenceForm from '../EvidenceForm.vue';

vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

function mountForm(props: Record<string, unknown> = {}) {
  const wrapper = mount(EvidenceForm, {
    props: {
      backmatterResources: [],
      ...props,
    },
    global: {
      stubs: {
        DatePicker: {
          props: [
            'modelValue',
            'maxDate',
            'minDate',
            'placeholder',
            'required',
            'dateFormat',
          ],
          emits: ['update:modelValue'],
          template: '<div data-testid="date-picker"></div>',
        },
        InputText: {
          props: ['modelValue', 'id', 'required', 'class'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Textarea: {
          props: ['modelValue', 'id', 'class'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
        },
        SelectButton: {
          props: ['modelValue', 'options', 'required'],
          emits: ['update:modelValue'],
          template: '<div></div>',
        },
        TertiaryButton: {
          props: ['type', 'class'],
          emits: ['click'],
          template:
            '<button :type="type" @click="$emit(\'click\')"><slot /></button>',
        },
        PrimaryButton: {
          props: ['type', 'disabled'],
          emits: ['click'],
          template:
            '<button :type="type || \'submit\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        SecondaryButton: {
          props: ['size', 'type'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        Base64FileUpload: {
          emits: ['uploaded'],
          template: '<div></div>',
        },
        BIconArrowRepeat: { template: '<span></span>' },
        BIconX: { template: '<span></span>' },
      },
    },
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

describe('EvidenceForm', () => {
  afterEach(() => {
    for (const wrapper of mountedWrappers) {
      wrapper.unmount();
    }
    mountedWrappers.length = 0;
  });

  // BCH-1284: End date in the future should be rejected with an inline error.
  // Observed: form is submittable with a future end date, resulting in a 400 from the API.
  // Expected: form is blocked and shows an inline error when the end date is in the future.
  it('disables the submit button and shows an inline error when the end date is in the future', async () => {
    const futureEnd = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const wrapper = mountForm({
      evidence: {
        start: '2024-01-01T00:00:00Z',
        end: futureEnd,
      },
    });

    await flushPromises();

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.attributes('disabled')).toBeDefined();

    const errorMessage = wrapper.find('.text-red-500');
    expect(errorMessage.exists()).toBe(true);
    expect(errorMessage.text()).toContain('future');
  });
});
