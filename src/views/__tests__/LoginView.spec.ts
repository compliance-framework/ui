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
  routeQuery: {} as Record<string, unknown>,
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
    query: mocks.routeQuery,
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
    mocks.routeQuery = {};
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
    await wrapper.find('form').trigger('submit', { cancelable: true });
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

  it('shows account loading error when hydration fails after password login', async () => {
    const wrapper = mountComponent();
    mocks.get.mockRejectedValue(new Error('failed to load user'));

    await wrapper
      .find('input[placeholder="Email"]')
      .setValue('user@example.com');
    await wrapper.find('input[placeholder="Password"]').setValue('password');
    await wrapper.find('form').trigger('submit', { cancelable: true });
    await flushPromises();

    const userStore = useUserStore();

    expect(mocks.login).toHaveBeenCalled();
    expect(mocks.get).toHaveBeenCalledWith('/api/users/me');
    expect(userStore.user).toBeNull();
    expect(userStore.isAuthenticated).toBe(false);
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Unable to Load Account',
      }),
    );
    expect(mocks.toastAdd).not.toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Login Failed',
      }),
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('keeps form errors safe when login returns a malformed 401 body', async () => {
    const wrapper = mountComponent();
    mocks.login.mockRejectedValue({
      response: {
        status: 401,
        data: undefined,
      },
    });

    await wrapper
      .find('input[placeholder="Email"]')
      .setValue('user@example.com');
    await wrapper.find('input[placeholder="Password"]').setValue('password');
    await wrapper.find('form').trigger('submit', { cancelable: true });
    await flushPromises();

    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Login Failed',
      }),
    );
    expect(wrapper.text()).toContain('Login');
  });

  it('ignores malformed auth error field values', async () => {
    const wrapper = mountComponent();
    mocks.login.mockRejectedValue({
      response: {
        status: 401,
        data: {
          data: {
            email: 'not-an-array',
            password: [123],
          },
        },
      },
    });

    await wrapper
      .find('input[placeholder="Email"]')
      .setValue('user@example.com');
    await wrapper.find('input[placeholder="Password"]').setValue('password');
    await wrapper.find('form').trigger('submit', { cancelable: true });
    await flushPromises();

    expect(mocks.get).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('not-an-array');
    expect(wrapper.text()).not.toContain('123');
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Login Failed',
      }),
    );
  });

  it('uses a safe relative next path after password login', async () => {
    mocks.routeQuery = { next: '/workflow-instances' };
    const wrapper = mountComponent();

    await wrapper
      .find('input[placeholder="Email"]')
      .setValue('user@example.com');
    await wrapper.find('input[placeholder="Password"]').setValue('password');
    await wrapper.find('form').trigger('submit', { cancelable: true });
    await flushPromises();

    expect(mocks.push).toHaveBeenCalledWith({ path: '/workflow-instances' });
  });

  it('falls back home when next is not a safe string path', async () => {
    mocks.routeQuery = { next: ['https://example.com'] };
    const wrapper = mountComponent();

    await wrapper
      .find('input[placeholder="Email"]')
      .setValue('user@example.com');
    await wrapper.find('input[placeholder="Password"]').setValue('password');
    await wrapper.find('form').trigger('submit', { cancelable: true });
    await flushPromises();

    expect(mocks.push).toHaveBeenCalledWith({ name: 'home' });
  });
});
