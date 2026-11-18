import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import IconButton from '../components/IconButton/IconButton.vue';

const stubs = { Tooltip: { template: '<slot />' } };

describe('IconButton', () => {
  it('is a plain action unless pressed is set', () => {
    const wrapper = mount(IconButton, {
      props: { icon: 'edit', label: 'Edit' },
      global: { stubs },
    });
    expect(wrapper.find('button').attributes('aria-pressed')).toBeUndefined();
  });

  it('shows a toggle as off (light) or on (bold), with the same name', async () => {
    const wrapper = mount(IconButton, {
      props: { icon: 'show', label: 'See hidden labels', pressed: false },
      global: { stubs },
    });
    const button = wrapper.find('button');
    expect(button.attributes('aria-pressed')).toBe('false');
    expect(button.classes()).toContain('icon-button--off');
    expect(button.find('svg').attributes('stroke-width')).toBe('2');

    await wrapper.setProps({ pressed: true });
    expect(button.attributes('aria-pressed')).toBe('true');
    expect(button.classes()).not.toContain('icon-button--off');
    expect(button.find('svg').attributes('stroke-width')).toBe('3');
    expect(button.attributes('aria-label')).toBe('See hidden labels');
  });
});
