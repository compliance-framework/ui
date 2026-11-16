import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import RiskOwnerAssignment from '../RiskOwnerAssignment.vue';

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: vi.fn(async () => ({ data: {} })) }),
  useDataApi: () => ({
    data: ref([
      { id: 'u-1', displayName: 'Ada Lovelace' },
      { id: 'u-2', displayName: 'Grace Hopper' },
    ]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('@/composables/workflows/useUserSearch', async () => {
  const { ref } = await import('vue');
  return {
    useUserSearch: () => ({
      userCache: ref({}),
      loadUsersByIds: vi.fn(async () => undefined),
      getCachedUser: (id: string) =>
        ({ 'u-1': { id: 'u-1', displayName: 'Ada Lovelace' } })[id],
    }),
  };
});

function mountPanel(props: Record<string, unknown> = {}) {
  const events: Record<string, unknown[][]> = {};
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(RiskOwnerAssignment, {
            initialValue: { ownerAssignments: [] },
            onChange: (...a: unknown[]) => (events.change ??= []).push(a),
            onSave: (...a: unknown[]) => (events.save ??= []).push(a),
            ...props,
          }),
        ),
    }),
  );
  return { wrapper, events };
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().startsWith(text))!;

describe('RiskOwnerAssignment', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('shows the owners read-only on the overview', async () => {
    const { wrapper } = mountPanel({
      initialValue: {
        primaryOwnerUserId: 'u-1',
        ownerAssignments: [
          { ownerKind: 'user', ownerRef: 'u-1', isPrimary: true },
        ],
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Primary owner');
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toContain('Other owners');
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('refuses to save without a primary owner', async () => {
    const { wrapper, events } = mountPanel();
    await flushPromises();
    await button(wrapper, 'Assign owners').trigger('click');
    await button(wrapper, 'Save owners').trigger('click');
    expect(wrapper.text()).toContain(
      'Primary owner is required before saving.',
    );
    expect(events.save).toBeUndefined();
  });

  it('makes the first chosen owner primary and saves', async () => {
    const { wrapper, events } = mountPanel();
    await flushPromises();
    await button(wrapper, 'Assign owners').trigger('click');
    await button(wrapper, 'Add owner').trigger('click');
    const vm = wrapper.findComponent(RiskOwnerAssignment).vm as unknown as {
      rows: { key: string }[];
      chooseUser: (row: unknown, id: string) => void;
    };
    vm.chooseUser(vm.rows[0], 'u-2');
    await flushPromises();
    expect(events.change?.at(-1)?.[0]).toEqual(
      expect.objectContaining({ primaryOwnerUserId: 'u-2' }),
    );
    expect(wrapper.text()).toContain('Grace Hopper');
    await button(wrapper, 'Save owners').trigger('click');
    expect(events.save).toHaveLength(1);
  });
});
