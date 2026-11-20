import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ItemList from '../components/ItemList/ItemList.vue';

const items = [{ id: 'a', title: 'AC-1', to: '/a' }];
const RouterLink = { props: ['to'], template: '<a :href="to"><slot /></a>' };

describe('ItemList rowLink', () => {
  it('keeps one link per row and marks the list so the link covers the row', () => {
    const wrapper = mount(ItemList, {
      props: { items, emptyText: 'None', rowLink: true },
      global: { stubs: { RouterLink } },
    });
    expect(wrapper.classes()).toContain('item-list--row-link');
    expect(wrapper.findAll('a')).toHaveLength(1);
  });

  it('is off by default', () => {
    const wrapper = mount(ItemList, {
      props: { items, emptyText: 'None' },
      global: { stubs: { RouterLink } },
    });
    expect(wrapper.classes()).not.toContain('item-list--row-link');
  });
});
