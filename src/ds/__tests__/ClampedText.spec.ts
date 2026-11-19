import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ClampedText from '../components/ClampedText/ClampedText.vue';

describe('ClampedText', () => {
  it('keeps all the text in the page and offers no toggle when it fits', () => {
    const wrapper = mount(ClampedText, { props: { text: 'Short.' } });
    expect(wrapper.text()).toBe('Short.');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('shows more and less when the text is cut', async () => {
    // jsdom does no layout: make the paragraph report more content than room.
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    });
    try {
      const wrapper = mount(ClampedText, { props: { text: 'Long text.' } });
      await wrapper.vm.$nextTick();
      const button = wrapper.get('button');
      expect(button.text()).toBe('Show more');
      expect(button.attributes('aria-expanded')).toBe('false');
      await button.trigger('click');
      expect(button.text()).toBe('Show less');
      expect(button.attributes('aria-expanded')).toBe('true');
      expect(wrapper.find('.clamped-text__body--cut').exists()).toBe(false);
    } finally {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });
});
