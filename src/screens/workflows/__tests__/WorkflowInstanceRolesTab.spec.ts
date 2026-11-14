import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, reactive, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import WorkflowInstanceRolesTab from '../WorkflowInstanceRolesTab.vue';

const store = vi.hoisted(() => ({
  value: undefined as unknown as {
    instance: unknown;
    roleAssignments: Record<string, unknown>[];
    addRoleAssignmentLocally: (a: Record<string, unknown>) => void;
    removeRoleAssignmentLocally: (id: string) => void;
  },
}));
vi.mock('@/stores/workflows/instances', () => ({
  useWorkflowInstanceStore: () => store.value,
}));
const workflows = vi.hoisted(() => ({
  createRoleAssignment: vi.fn(),
  deleteRoleAssignment: vi.fn(),
}));
vi.mock('@/composables/workflows', () => ({
  useWorkflowInstances: () => workflows,
}));
vi.mock('@/composables/workflows/useUserSearch', () => ({
  useUserSearch: () => ({
    loadUsersByIds: vi.fn(),
    getCachedUser: (id: string) =>
      id === 'u-1' ? { id, displayName: 'Ada Lovelace' } : undefined,
  }),
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([{ id: 'u-2', displayName: 'Grace Hopper' }]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

async function mountTab() {
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(WorkflowInstanceRolesTab)),
    }),
    { attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

const menuFor = (wrapper: ReturnType<typeof mount>, role: string) =>
  wrapper
    .findAllComponents(Menu)
    .find((m) => m.props('label') === `Actions for ${role}`)!
    .props('items') as MenuAction[];

describe('WorkflowInstanceRolesTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    workflows.createRoleAssignment.mockReset();
    workflows.deleteRoleAssignment.mockReset().mockResolvedValue(undefined);
    store.value = reactive({
      instance: {
        id: 'wi-1',
        workflowDefinition: {
          steps: [
            { responsibleRole: 'Approver' },
            { responsibleRole: 'Reviewer' },
            { responsibleRole: 'Approver' },
          ],
        },
      },
      roleAssignments: [
        { id: 'ra-1', roleName: 'Approver', assignedToId: 'u-1' } as Record<
          string,
          unknown
        >,
        {
          id: 'ra-2',
          roleName: 'Auditor',
          assignedToId: 'audit-team',
          assignedToType: 'group',
        },
      ],
      addRoleAssignmentLocally(a: Record<string, unknown>) {
        this.roleAssignments.push(a);
      },
      removeRoleAssignmentLocally(id: string) {
        this.roleAssignments = this.roleAssignments.filter((a) => a.id !== id);
      },
    });
  });

  it('lists every step role with its holder, including groups and unassigned roles', async () => {
    const wrapper = await mountTab();
    const text = wrapper.text();
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('audit-team (group)');
    expect(text).toContain('Unassigned');
    expect(text).toContain('1 role still to assign');
    wrapper.unmount();
  });

  it('offers Assign for an unassigned role and asks who takes it', async () => {
    const wrapper = await mountTab();
    menuFor(wrapper, 'Reviewer').find((i) => i.label === 'Assign role')!
      .onSelect!();
    await flushPromises();
    const submit = () =>
      [...document.querySelectorAll('button')]
        .find((b) => b.textContent?.trim() === 'Assign')!
        .click();
    submit();
    await flushPromises();
    expect(document.body.textContent).toContain('Choose who takes this role.');
    expect(workflows.createRoleAssignment).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('removes an assignment after confirmation', async () => {
    const wrapper = await mountTab();
    menuFor(wrapper, 'Approver').find((i) => i.label === 'Remove assignment')!
      .onSelect!();
    await flushPromises();
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(workflows.deleteRoleAssignment).toHaveBeenCalledWith('ra-1');
    expect(wrapper.text()).toContain('2 roles still to assign');
    wrapper.unmount();
  });
});
