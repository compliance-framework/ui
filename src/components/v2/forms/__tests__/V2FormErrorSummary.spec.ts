import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import V2FormErrorSummary from '@/components/v2/forms/V2FormErrorSummary.vue';
import { focusFirstInvalidField } from '@/composables/v2/useV2FormValidation';

describe('V2FormErrorSummary', () => {
  it('renders all errors and focuses the summary container', async () => {
    const wrapper = mount(V2FormErrorSummary, {
      attachTo: document.body,
      props: {
        errors: [
          { fieldId: 'field-a', message: 'Field A is required.' },
          { message: 'General error message.' },
        ],
      },
    });

    await nextTick();

    const section = wrapper.find('section');
    expect(section.exists()).toBe(true);
    expect(section.text()).toContain('Field A is required.');
    expect(section.text()).toContain('General error message.');
    expect(document.activeElement).toBe(section.element);

    wrapper.unmount();
  });

  it('focuses the linked field when an error link is clicked', async () => {
    const input = document.createElement('input');
    input.id = 'field-linked';
    document.body.appendChild(input);

    const wrapper = mount(V2FormErrorSummary, {
      attachTo: document.body,
      props: {
        errors: [
          { fieldId: 'field-linked', message: 'Linked field is invalid.' },
        ],
      },
    });

    await nextTick();

    await wrapper.find('button').trigger('click');
    expect(document.activeElement).toBe(input);

    wrapper.unmount();
    input.remove();
  });
});

describe('focusFirstInvalidField', () => {
  it('focuses the first invalid control in the container', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input id="valid" />
      <input id="invalid" aria-invalid="true" />
      <input id="invalid-second" data-invalid="true" />
    `;
    document.body.appendChild(container);

    const focused = focusFirstInvalidField(container);
    const invalidElement = container.querySelector('#invalid') as HTMLElement;

    expect(focused).toBe(true);
    expect(document.activeElement).toBe(invalidElement);

    container.remove();
  });
});
