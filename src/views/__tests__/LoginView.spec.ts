import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginView from '../LoginView.vue';
import { useUserStore } from '@/stores/auth';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  get: vi.fn(),
  push: vi.fn(),
  toastAdd: vi.fn(),
  loadProviders: vi.fn(),
  initiateLogin: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useGuestApi: () => ({
    execute: mocks.login,
  }),
  useGuestInstance: () => ({
    get: mocks.get,
  }),
}));

vi.mock('@/composables/useOIDC', () => ({
  useOIDC: () => ({
    providers: { value: [] },
    isLoading: { value: false },
    error: { value: null },
    loadProviders: mocks.loadProviders,
    initiateLogin: mocks.initiateLogin,
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mocks.toastAdd,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {},
  }),
  useRouter: () => ({
    push: mocks.push,
  }),
}));

function mountComponent() {
  return mount(LoginView, {
    global: {
      stubs: {
        PageCard: { template: '<div><slot /></div>' },
        SideNavLogo: { template: '<div />' },
        PrimaryButton: {
          props: ['type'],
          template: '<button :type="type"><slot /></button>',
        },
        FormInput: {
          props: ['modelValue', 'placeholder', 'type'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" :placeholder="placeholder" :type="type || \'text\'" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  });
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.login.mockResolvedValue({});
    mocks.get.mockResolvedValue({
      data: {
        data: {
          id: 'user-1',
          email: 'user@example.com',
          firstName: 'Password',
          lastName: 'User',
          authMethod: 'password',
          failedLogins: 0,
        },
      },
    });
  });

  it('hydrates the auth store user after password login', async () => {
    const wrapper = mountComponent();

    await wrapper
      .find('input[placeholder="Email"]')
      .setValue('user@example.com');
    await wrapper.find('input[placeholder="Password"]').setValue('password');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const userStore = useUserStore();

    expect(mocks.login).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
        password: 'password',
      },
    });
    expect(mocks.get).toHaveBeenCalledWith('/api/users/me');
    expect(userStore.user?.id).toBe('user-1');
    expect(userStore.isAuthenticated).toBe(true);
    expect(mocks.push).toHaveBeenCalledWith({ name: 'home' });
  });
});
