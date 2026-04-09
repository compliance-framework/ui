import { afterEach, describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MultiSelectDropdown from '../forms/MultiSelectDropdown.vue';

describe('MultiSelectDropdown', () => {
  const options = [
    { label: 'Email', value: 'email' },
    { label: 'Slack', value: 'slack' },
  ];
  const cleanupElements: HTMLElement[] = [];

  afterEach(() => {
    cleanupElements.forEach((element) => element.remove());
    cleanupElements.length = 0;
  });

  it('applies aria-labelledby from an explicit prop', () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: {
        options,
        id: 'notification-channels',
        ariaLabelledby: 'notification-heading',
      },
    });

    const trigger = wrapper.find('button');
    expect(trigger.attributes('type')).toBe('button');
    expect(trigger.attributes('id')).toBe('notification-channels');
    expect(trigger.attributes('aria-labelledby')).toBe('notification-heading');
  });

  it('supports aria-label as an alternative label source', () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: {
        options,
        ariaLabel: 'Notification channels',
      },
    });

    const trigger = wrapper.find('button');
    expect(trigger.attributes('aria-label')).toBe('Notification channels');
  });

  it('does not render aria-labelledby when not provided', () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: {
        options,
      },
    });

    const trigger = wrapper.find('button');
    expect(trigger.attributes('aria-labelledby')).toBeUndefined();
  });

  it('closes the dropdown when Escape is pressed', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      attachTo: document.body,
      props: {
        options,
      },
    });

    const trigger = wrapper.find('button');
    await trigger.trigger('click');

    expect((wrapper.vm as unknown as { isOpen: boolean }).isOpen).toBe(true);

    const checkbox = wrapper.find('input[type="checkbox"]');
    (checkbox.element as HTMLInputElement).focus();
    await checkbox.trigger('keydown', { key: 'Escape' });

    expect((wrapper.vm as unknown as { isOpen: boolean }).isOpen).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
  });

  it('keeps the dropdown open when focus moves within the component', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      attachTo: document.body,
      props: {
        options,
      },
    });

    await wrapper.find('button').trigger('click');
    const checkbox = wrapper.find('input[type="checkbox"]');

    await wrapper.trigger('focusout', {
      relatedTarget: checkbox.element,
    });

    expect((wrapper.vm as unknown as { isOpen: boolean }).isOpen).toBe(true);
  });

  it('closes the dropdown when focus leaves the component', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      attachTo: document.body,
      props: {
        options,
      },
    });

    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    cleanupElements.push(outsideButton);

    await wrapper.find('button').trigger('click');
    await wrapper.trigger('focusout', {
      relatedTarget: outsideButton,
    });

    expect((wrapper.vm as unknown as { isOpen: boolean }).isOpen).toBe(false);
  });

  it('keeps the dropdown open when an option is selected with the mouse', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      attachTo: document.body,
      props: {
        options,
        modelValue: [],
      },
    });

    await wrapper.find('button').trigger('click');
    const checkbox = wrapper.find('input[type="checkbox"]');

    await wrapper.trigger('mousedown');
    await wrapper.trigger('focusout', {
      relatedTarget: null,
    });
    await checkbox.setValue(true);

    expect(wrapper.emitted('update:modelValue')).toEqual([[['email']]]);
    expect((wrapper.vm as unknown as { isOpen: boolean }).isOpen).toBe(true);
  });

  it('keeps the dropdown open when focusout has no related target', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      attachTo: document.body,
      props: {
        options,
      },
    });

    await wrapper.find('button').trigger('click');
    await wrapper.trigger('focusout', {
      relatedTarget: null,
    });

    expect((wrapper.vm as unknown as { isOpen: boolean }).isOpen).toBe(true);
  });
});
