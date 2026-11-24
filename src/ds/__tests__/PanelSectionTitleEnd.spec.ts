import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PanelSection from '../components/layout/PanelSection.vue';

describe('PanelSection', () => {
  it('puts a status right after its title, outside the heading', () => {
    const wrapper = mount(PanelSection, {
      props: { title: 'Evidence' },
      slots: { 'title-end': '<span class="counts">3 1 2</span>' },
    });
    const row = wrapper.get('.panel-section__title-row');
    expect(row.get('h3').text()).toBe('Evidence');
    expect(row.find('.counts').exists()).toBe(true);
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(
      row.get('h3').attributes('id'),
    );
  });

  it('has a bare title without one', () => {
    const wrapper = mount(PanelSection, { props: { title: 'Evidence' } });
    expect(wrapper.find('.panel-section__title-row').exists()).toBe(false);
    expect(wrapper.get('h3').text()).toBe('Evidence');
  });
});
