import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MultiSelectDropdown from '../forms/MultiSelectDropdown.vue';

describe('MultiSelectDropdown', () => {
  const options = [
    { label: 'Email', value: 'email' },
    { label: 'Slack', value: 'slack' },
  ];

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
});
