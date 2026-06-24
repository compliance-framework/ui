import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import GroupRolesPanel from '../GroupRolesPanel.vue';
import type { CCFRoleAssignment } from '@/stores/types';

const {
  mockApiState,
  postMock,
  deleteMock,
  executeMock,
  toastAddMock,
  permState,
} = vi.hoisted(() => ({
  mockApiState: {
    rolesResponse: [] as CCFRoleAssignment[],
    error: null as unknown,
  },
  postMock: vi.fn(),
  deleteMock: vi.fn(),
  executeMock: vi.fn(),
  toastAddMock: vi.fn(),
  permState: { can: true },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('primevue/tooltip', () => ({
  default: { mounted() {}, updated() {}, unmounted() {} },
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.can,
    permissionTooltip: () => '',
  }),
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    decamelizeKeys: (data: unknown) => data,
    useDataApi: () => ({
      data: ref(mockApiState.rolesResponse),
      isLoading: ref(false),
      error: ref(mockApiState.error),
      execute: executeMock,
    }),
    useAuthenticatedInstance: () => ({ post: postMock, delete: deleteMock }),
  };
});

const stubs = {
  PrimaryButton: {
    props: ['disabled'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SecondaryButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  Badge: { template: '<span><slot /></span>' },
  Dialog: { template: '<div><slot /></div>' },
  Label: { template: '<label><slot /></label>' },
  Message: { template: '<div><slot /></div>' },
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.name" :value="o.name">{{ o.name }}</option></select>',
  },
};

function makeAssignment(
  overrides: Partial<CCFRoleAssignment> = {},
): CCFRoleAssignment {
  return {
    id: 'g-ra-1',
    roleName: 'contributor',
    assigneeType: 'group',
    assigneeId: 'security-team',
    source: 'manual',
    ...overrides,
  };
}

function mountPanel() {
  return mount(GroupRolesPanel, {
    props: { groupId: 'group-1', groupName: 'security-team' },
    global: { stubs },
  });
}

function buttonTexts(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper.findAll('button').map((b) => b.text());
}

describe('GroupRolesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiState.rolesResponse = [];
    mockApiState.error = null;
    permState.can = true;
    executeMock.mockResolvedValue(undefined);
    postMock.mockResolvedValue({});
    deleteMock.mockResolvedValue({});
  });

  it('renders manual and config-locked roles distinctly', async () => {
    mockApiState.rolesResponse = [
      makeAssignment({
        id: 'g-ra-1',
        roleName: 'contributor',
        source: 'manual',
      }),
      makeAssignment({ id: 'g-ra-2', roleName: 'viewer', source: 'config' }),
    ];
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain('contributor');
    expect(wrapper.text()).toContain('Manual');
    expect(wrapper.text()).toContain('viewer');
    expect(wrapper.text()).toContain('Config-locked');
  });

  it('hides the remove control for config-locked rows', async () => {
    mockApiState.rolesResponse = [
      makeAssignment({ id: 'g-ra-2', roleName: 'viewer', source: 'config' }),
    ];
    const wrapper = mountPanel();
    await flushPromises();

    expect(buttonTexts(wrapper)).not.toContain('Remove');
  });

  it('deletes a manual group grant by its id', async () => {
    mockApiState.rolesResponse = [
      makeAssignment({
        id: 'g-ra-1',
        roleName: 'contributor',
        source: 'manual',
      }),
    ];
    const wrapper = mountPanel();
    await flushPromises();

    const removeBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Remove');
    expect(removeBtn).toBeTruthy();
    await removeBtn!.trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/admin/role-assignments/g-ra-1',
    );
  });

  it('assigns a role to the group by name', async () => {
    mockApiState.rolesResponse = [];
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.find('select').setValue('auditor');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith('/api/admin/role-assignments', {
      roleName: 'auditor',
      assigneeType: 'group',
      assigneeId: 'security-team',
    });
  });

  it('hides assign and remove controls without permission', async () => {
    permState.can = false;
    mockApiState.rolesResponse = [
      makeAssignment({
        id: 'g-ra-1',
        roleName: 'contributor',
        source: 'manual',
      }),
    ];
    const wrapper = mountPanel();
    await flushPromises();

    const texts = buttonTexts(wrapper);
    expect(texts).not.toContain('Assign Role');
    expect(texts).not.toContain('Remove');
  });
});
