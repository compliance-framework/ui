import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import Select from '@/ds/components/Select/Select.vue';
import type { CCFRoleAssignment, EffectiveRole } from '@/stores/types';
import RoleAssignmentsSection from '../RoleAssignmentsSection.vue';

const { state, postMock, deleteMock, executeMock, toastAddMock } = vi.hoisted(
  () => ({
    state: {
      roles: [] as (EffectiveRole | CCFRoleAssignment)[],
      can: true,
      urls: [] as string[],
    },
    postMock: vi.fn(),
    deleteMock: vi.fn(),
    executeMock: vi.fn(),
    toastAddMock: vi.fn(),
  }),
);

vi.mock('@/ds/toasts', () => ({
  useToast: () => ({ add: toastAddMock }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => state.can }),
}));
vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: (url: string) => {
      state.urls.push(url);
      return {
        data: ref(state.roles),
        isLoading: ref(false),
        isFinished: ref(true),
        error: ref(undefined),
        execute: executeMock,
      };
    },
    useAuthenticatedInstance: () => ({ post: postMock, delete: deleteMock }),
  };
});

function mountSection(assigneeType: 'user' | 'group') {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(RoleAssignmentsSection, {
            rolesUrl:
              assigneeType === 'user'
                ? '/api/admin/users/user-1/roles'
                : '/api/admin/groups/group-1/roles',
            assigneeType,
            assigneeId:
              assigneeType === 'user' ? 'alice@example.com' : 'platform-team',
            description: 'Roles.',
            emptyBody: 'None.',
          }),
        ),
    }),
    { attachTo: document.body },
  );
}

/** Remove buttons by row, and whether each is usable. */
const removes = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAll('tbody tr')
    .map((row) => [
      row.find('th, td').text(),
      row.find('button').attributes('aria-disabled') !== 'true',
    ]);

const clickButton = (label: string) =>
  [...document.querySelectorAll('button')]
    .find((b) => b.textContent?.trim().startsWith(label))!
    .click();

describe('RoleAssignmentsSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.roles = [];
    state.can = true;
    state.urls = [];
    executeMock.mockResolvedValue(undefined);
    postMock.mockResolvedValue({});
    deleteMock.mockResolvedValue({});
  });

  it("shows a user's direct and inherited roles, removable only when direct and manual", async () => {
    state.roles = [
      {
        assignmentId: 'a-1',
        roleName: 'admin',
        source: 'manual',
        inherited: false,
      },
      {
        assignmentId: 'a-2',
        roleName: 'viewer',
        source: 'config',
        inherited: false,
      },
      {
        assignmentId: 'a-3',
        roleName: 'auditor',
        source: 'manual',
        inherited: true,
        viaGroup: 'audit-team',
      },
    ];
    const wrapper = mountSection('user');
    await flushPromises();
    expect(state.urls).toContain('/api/admin/users/user-1/roles');
    expect(wrapper.text()).toContain('Inherited via audit-team');
    expect(wrapper.text()).toContain('Configuration');
    expect(removes(wrapper)).toEqual([
      ['admin', true],
      ['viewer', false],
      ['auditor', false],
    ]);
    wrapper.unmount();
  });

  it('removes a manual grant by its assignment id (user) or id (group)', async () => {
    state.roles = [
      {
        assignmentId: 'a-1',
        roleName: 'admin',
        source: 'manual',
        inherited: false,
      },
    ];
    let wrapper = mountSection('user');
    await flushPromises();
    await wrapper.find('tbody button').trigger('click');
    await flushPromises();
    expect(deleteMock).toHaveBeenCalledWith('/api/admin/role-assignments/a-1');
    wrapper.unmount();

    state.roles = [
      {
        id: 'g-1',
        roleName: 'viewer',
        source: 'manual',
        assigneeType: 'group',
        assigneeId: 'platform-team',
      } as CCFRoleAssignment,
    ];
    wrapper = mountSection('group');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Origin');
    await wrapper.find('tbody button').trigger('click');
    await flushPromises();
    expect(deleteMock).toHaveBeenCalledWith('/api/admin/role-assignments/g-1');
    wrapper.unmount();
  });

  it('assigns a role, offering only roles not already held directly', async () => {
    state.roles = [
      {
        id: 'g-1',
        roleName: 'admin',
        source: 'manual',
        assigneeType: 'group',
        assigneeId: 'platform-team',
      } as CCFRoleAssignment,
    ];
    const wrapper = mountSection('group');
    await flushPromises();
    clickButton('Assign role');
    await flushPromises();
    const select = wrapper.findComponent(Select);
    const offered = (select.props('options') as { value: string }[]).map(
      (o) => o.value,
    );
    expect(offered).not.toContain('admin');
    expect(offered).toContain('viewer');
    select.vm.$emit('update:modelValue', 'viewer');
    await flushPromises();
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(postMock).toHaveBeenCalledWith('/api/admin/role-assignments', {
      roleName: 'viewer',
      assigneeType: 'group',
      assigneeId: 'platform-team',
    });
    wrapper.unmount();
  });

  it('disables assigning and removing, saying why, without permission', async () => {
    state.can = false;
    state.roles = [
      {
        assignmentId: 'a-1',
        roleName: 'admin',
        source: 'manual',
        inherited: false,
      },
    ];
    const wrapper = mountSection('user');
    await flushPromises();
    expect(removes(wrapper)).toEqual([['admin', false]]);
    const assign = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Assign role'))!;
    expect(assign.attributes('aria-disabled')).toBe('true');
    expect(document.body.textContent).toContain(
      "Your access doesn't include assigning roles.",
    );
    wrapper.unmount();
  });
});
