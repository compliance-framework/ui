import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Text from '../components/Text/Text.vue';

describe('Text', () => {
  it('sets text in italics without stressing it', () => {
    const wrapper = mount(Text, {
      props: { italic: true },
      slots: { default: 'A remark.' },
    });
    expect(wrapper.element.tagName).toBe('P');
    expect(wrapper.classes()).toContain('text--italic');
    expect(mount(Text).classes()).not.toContain('text--italic');
  });
});
