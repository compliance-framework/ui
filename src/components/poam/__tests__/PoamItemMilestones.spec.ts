import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import PoamItemMilestones from '../PoamItemMilestones.vue';

const state = vi.hoisted(() => ({
  milestones: [] as unknown[],
  create: vi.fn(),
  update: vi.fn(),
  reload: vi.fn(),
}));
vi.mock('@/composables/usePoamItems', async () => {
  const { ref } = await import('vue');
  return {
    useMilestonesList: () => ({
      data: ref(state.milestones),
      isLoading: ref(false),
      execute: state.reload,
    }),
    useMilestoneCreate: () => ({ createMilestone: state.create, error: ref() }),
    useMilestoneUpdate: () => ({ updateMilestone: state.update, error: ref() }),
    useMilestoneDelete: () => ({ deleteMilestone: vi.fn(), error: ref() }),
    milestoneStatusLabel: (s: string) => s,
  };
});
vi.mock('@/composables/workflows/useUserSearch', () => ({
  useUserSearch: () => ({
    loadUsersByIds: vi.fn(),
    getCachedUser: () => undefined,
  }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));
vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({ confirmDeleteDialog: vi.fn() }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([{ id: 'u-1', displayName: 'Ada Lovelace' }]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

function mountPanel() {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(PoamItemMilestones, { poamItemId: 'item-1' }),
        ),
    }),
    { attachTo: document.body },
  );
}

describe('PoamItemMilestones', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.milestones = [
      {
        id: 'm-1',
        title: 'Patch hosts',
        status: 'open',
        plannedCompletionDate: '2020-01-01T00:00:00Z',
      },
    ];
  });

  it('lists tasks with status, progress and overdue', () => {
    const wrapper = mountPanel();
    expect(wrapper.text()).toContain('Patch hosts');
    expect(wrapper.text()).toContain('0 of 1 done');
    expect(wrapper.text()).toContain('Overdue');
    wrapper.unmount();
  });

  // The classic panel never listened for the dialog's save, so adding a task did nothing.
  it('saves a new task', async () => {
    const wrapper = mountPanel();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add task')!
      .trigger('click');
    await flushPromises();
    const input = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input',
    )!;
    input.value = 'Rotate keys';
    input.dispatchEvent(new Event('input'));
    document
      .querySelector<HTMLFormElement>('[role="dialog"] form')!
      .dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rotate keys', status: 'open' }),
    );
    expect(state.reload).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('asks for a title', async () => {
    const wrapper = mountPanel();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add task')!
      .trigger('click');
    await flushPromises();
    document
      .querySelector<HTMLFormElement>('[role="dialog"] form')!
      .dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(document.body.textContent).toContain('Enter a title.');
    expect(state.create).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
