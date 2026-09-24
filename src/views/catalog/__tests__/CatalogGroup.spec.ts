import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CatalogGroup from '../CatalogGroup.vue';
import type { Catalog, Group } from '@/oscal';

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: { value: [] },
    execute: vi.fn(),
    isLoading: { value: false },
    error: { value: null },
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({ confirmDeleteDialog: vi.fn() }),
}));

const catalog: Catalog = {
  uuid: 'catalog-1',
  metadata: { title: 'Catalog One' },
} as Catalog;

const group: Group = {
  id: 'ac',
  title: 'Access Control',
} as Group;

function mountGroup() {
  return mount(CatalogGroup, {
    props: { catalog, group },
    global: {
      stubs: {
        PartDisplayEditor: true,
        GroupCreateModal: { template: '<div />' },
        GroupDescriptionModal: { template: '<div />' },
        ControlCreateModal: { template: '<div />' },
        GroupEditModal: {
          props: ['modelValue'],
          template:
            "<div data-testid=\"group-edit-modal\">{{ modelValue ? 'open' : 'closed' }}</div>",
        },
      },
    },
  });
}

describe('CatalogGroup', () => {
  it('opens the edit modal on the first Edit click, even before the group has ever been expanded', async () => {
    const wrapper = mountGroup();

    // Collapsed by default — CollapsableGroup's body (where the modal used to live,
    // conditionally mounted) isn't in the DOM yet at this point.
    const editButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit')!;
    await editButton.trigger('click');

    const modal = wrapper.find('[data-testid="group-edit-modal"]');
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toBe('open');
  });
});
