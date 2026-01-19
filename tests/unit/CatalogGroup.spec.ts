import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import CatalogGroup from '@/views/catalog/CatalogGroup.vue';

const catalog = { uuid: 'TEST-CAT', metadata: { title: 't' } } as any;
const group = { id: 'G-1', title: 'g', parts: [] } as any;

describe('CatalogGroup', () => {
  it('renders action buttons', async () => {
    const wrapper = mount(CatalogGroup, {
      props: { catalog, group },
    });
    expect(wrapper.find('button').text()).toContain('Delete');
    expect(wrapper.text()).toContain('Edit');
    expect(wrapper.text()).toContain('Add Group');
    expect(wrapper.text()).toContain('Add Control');
    expect(wrapper.text()).toContain('Edit Description');
  });
});
