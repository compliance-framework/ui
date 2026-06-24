import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import UserRolesPanel from '../UserRolesPanel.vue';
import type { EffectiveRole } from '@/stores/types';

const {
  mockApiState,
  postMock,
  deleteMock,
  executeMock,
  toastAddMock,
  permState,
} = vi.hoisted(() => ({
  mockApiState: {
    rolesResponse: [] as EffectiveRole[],
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

function mountPanel() {
  return mount(UserRolesPanel, {
    props: { userId: 'user-1', userEmail: 'alice@example.com' },
    global: { stubs },
  });
}

function buttonTexts(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper.findAll('button').map((b) => b.text());
}

describe('UserRolesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiState.rolesResponse = [];
    mockApiState.error = null;
    permState.can = true;
    executeMock.mockResolvedValue(undefined);
    postMock.mockResolvedValue({});
    deleteMock.mockResolvedValue({});
  });

  it('renders direct and inherited roles distinctly', async () => {
    mockApiState.rolesResponse = [
      {
        assignmentId: 'ra-1',
        roleName: 'admin',
        source: 'manual',
        inherited: false,
      },
      {
        assignmentId: 'ra-3',
        roleName: 'auditor',
        source: 'manual',
        inherited: true,
        viaGroup: 'security-team',
      },
    ];
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain('admin');
    expect(wrapper.text()).toContain('Direct');
    expect(wrapper.text()).toContain('auditor');
    expect(wrapper.text()).toContain('Inherited via security-team');
  });

  it('hides the remove control for config-locked rows', async () => {
    mockApiState.rolesResponse = [
      {
        assignmentId: 'ra-2',
        roleName: 'viewer',
        source: 'config',
        inherited: false,
      },
    ];
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain('Config-locked');
    expect(buttonTexts(wrapper)).not.toContain('Remove');
  });

  it('hides the remove control for inherited rows', async () => {
    mockApiState.rolesResponse = [
      {
        assignmentId: 'ra-3',
        roleName: 'auditor',
        source: 'manual',
        inherited: true,
        viaGroup: 'security-team',
      },
    ];
    const wrapper = mountPanel();
    await flushPromises();

    expect(buttonTexts(wrapper)).not.toContain('Remove');
  });

  it('deletes a manual direct grant by its assignment id', async () => {
    mockApiState.rolesResponse = [
      {
        assignmentId: 'ra-1',
        roleName: 'admin',
        source: 'manual',
        inherited: false,
      },
    ];
    const wrapper = mountPanel();
    await flushPromises();

    const removeBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Remove');
    expect(removeBtn).toBeTruthy();
    await removeBtn!.trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith('/api/admin/role-assignments/ra-1');
  });

  it('assigns a direct role to the user by email', async () => {
    mockApiState.rolesResponse = [];
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.find('select').setValue('viewer');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith('/api/admin/role-assignments', {
      roleName: 'viewer',
      assigneeType: 'user',
      assigneeId: 'alice@example.com',
    });
  });

  it('hides assign and remove controls without permission', async () => {
    permState.can = false;
    mockApiState.rolesResponse = [
      {
        assignmentId: 'ra-1',
        roleName: 'admin',
        source: 'manual',
        inherited: false,
      },
    ];
    const wrapper = mountPanel();
    await flushPromises();

    const texts = buttonTexts(wrapper);
    expect(texts).not.toContain('Assign Role');
    expect(texts).not.toContain('Remove');
  });
});
