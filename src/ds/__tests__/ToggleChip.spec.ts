import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ToggleChip from '../components/ToggleChip/ToggleChip.vue';

describe('ToggleChip', () => {
  it('is a button reporting its pressed state', () => {
    const wrapper = mount(ToggleChip, {
      props: { pressed: true },
      slots: { default: 'host-a' },
    });
    const button = wrapper.find('button');
    expect(button.attributes('type')).toBe('button');
    expect(button.attributes('aria-pressed')).toBe('true');
    expect(button.text()).toBe('host-a');
  });

  it('marks a muted chip and passes listeners and attributes to the button', async () => {
    let clicks = 0;
    const wrapper = mount(ToggleChip, {
      props: { pressed: false, muted: true },
      attrs: { 'data-test': 'pick', onClick: () => clicks++ },
    });
    const button = wrapper.find('button');
    expect(button.attributes('aria-pressed')).toBe('false');
    expect(button.classes()).toContain('toggle-chip--muted');
    expect(button.attributes('data-test')).toBe('pick');
    await button.trigger('click');
    expect(clicks).toBe(1);
  });
});
