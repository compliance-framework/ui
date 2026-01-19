import { shallowMount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CatalogGroup from '@/views/catalog/CatalogGroup.vue';

vi.mock('primevue/usetoast', () => {
  return {
    useToast: () => ({ add: vi.fn() }),
  };
});

vi.mock('@/composables/axios', () => {
  return {
    useDataApi: () => ({
      data: { value: [] },
      execute: vi.fn(),
    }),
  };
});

const catalog = { uuid: 'TEST-CAT', metadata: { title: 't' } } as any;
const group = { id: 'G-1', title: 'g', parts: [] } as any;

describe('CatalogGroup', () => {
  it('renders action buttons', async () => {
    const wrapper = shallowMount(CatalogGroup, {
      props: { catalog, group },
      global: {
        stubs: {
          TertiaryButton: true,
          CatalogControl: true,
          CatalogGroup: true,
          GroupCreateModal: true,
          ControlCreateModal: true,
          GroupEditModal: true,
          GroupDescriptionModal: true,
          PartDisplayEditor: true,
        },
      },
    });
    expect(wrapper.find('button').text()).toContain('Delete');
    expect(wrapper.text()).toContain('Edit');
    expect(wrapper.text()).toContain('Add Group');
    expect(wrapper.text()).toContain('Add Control');
    expect(wrapper.text()).toContain('Edit Description');
  });
});
