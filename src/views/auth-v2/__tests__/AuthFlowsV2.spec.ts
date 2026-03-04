import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick } from 'vue';
import LoginView from '../LoginView.vue';
import SSOCallbackView from '../SSOCallbackView.vue';

const mocks = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  loginExecute: vi.fn(),
  guestGet: vi.fn(),
  oidcLoadProviders: vi.fn(),
  oidcInitiateLogin: vi.fn(),
  oidcProviders: { value: [] as Array<{ name: string; displayName: string }> },
  oidcIsLoading: { value: false },
  oidcError: { value: null as string | null },
  userStore: {
    user: null as null | {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      failedLogins: number;
    },
    isAuthenticated: false,
    logout: vi.fn(),
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mocks.toastAdd,
  }),
}));

vi.mock('@/composables/axios', () => ({
  useGuestApi: (url: string) => {
    if (url === '/api/auth/login') {
      return {
        execute: mocks.loginExecute,
      };
    }

    return {
      execute: vi.fn(),
    };
  },
  useGuestInstance: () => ({
    get: mocks.guestGet,
  }),
}));

vi.mock('@/composables/useOIDC', () => ({
  useOIDC: () => ({
    providers: mocks.oidcProviders,
    isLoading: mocks.oidcIsLoading,
    error: mocks.oidcError,
    loadProviders: mocks.oidcLoadProviders,
    initiateLogin: mocks.oidcInitiateLogin,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useUserStore: () => mocks.userStore,
}));

const authComponentStub = { template: '<div><slot /></div>' };

const authInputStub = {
  props: ['modelValue', 'id', 'type'],
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const authButtonStub = {
  props: ['disabled', 'type'],
  template: '<button :disabled="disabled" :type="type"><slot /></button>',
};

async function createTestRouter(startPath: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/auth/login',
        name: 'login',
        component: { template: '<div>Login</div>' },
      },
      {
        path: '/auth/forgot-password',
        name: 'forgot-password',
        component: { template: '<div>Forgot</div>' },
      },
      {
        path: '/auth/sso/callback',
        name: 'sso-callback',
        component: { template: '<div>Callback</div>' },
      },
      {
        path: '/',
        name: 'home',
        component: { template: '<div>Home</div>' },
      },
      {
        path: '/evidence',
        name: 'evidence:index',
        component: { template: '<div>Evidence</div>' },
      },
    ],
  });

  await router.push(startPath);
  await router.isReady();
  return router;
}

async function flushAsync() {
  await Promise.resolve();
  await nextTick();
}

describe('Auth V2 flow validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userStore.user = null;
    mocks.userStore.isAuthenticated = false;
    mocks.oidcProviders.value = [];
    mocks.oidcIsLoading.value = false;
    mocks.oidcError.value = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles login success and redirects to requested next path', async () => {
    mocks.loginExecute.mockResolvedValue({ data: { data: {} } });
    const router = await createTestRouter('/auth/login?next=%2Fevidence');
    const pushSpy = vi.spyOn(router, 'push');

    const wrapper = mount(LoginView, {
      global: {
        plugins: [router],
        stubs: {
          AuthPanelCard: authComponentStub,
          AuthInput: authInputStub,
          AuthPrimaryButton: authButtonStub,
        },
      },
    });

    await wrapper.get('#email').setValue('user@example.com');
    await wrapper.get('#password').setValue('Secret123!');
    await wrapper.get('form').trigger('submit.prevent');
    await flushAsync();

    expect(mocks.loginExecute).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
        password: 'Secret123!',
      },
    });
    expect(mocks.userStore.isAuthenticated).toBe(true);
    expect(pushSpy).toHaveBeenCalledWith('/evidence');
  });

  it('handles login validation errors without authenticating the user', async () => {
    mocks.loginExecute.mockRejectedValue({
      status: 401,
      response: {
        data: {
          data: {
            email: ['Invalid credentials'],
            password: [],
          },
        },
      },
    });

    const router = await createTestRouter('/auth/login');

    const wrapper = mount(LoginView, {
      global: {
        plugins: [router],
        stubs: {
          AuthPanelCard: authComponentStub,
          AuthInput: authInputStub,
          AuthPrimaryButton: authButtonStub,
        },
      },
    });

    await wrapper.get('#email').setValue('bad@example.com');
    await wrapper.get('#password').setValue('bad-password');
    await wrapper.get('form').trigger('submit.prevent');
    await flushAsync();

    expect(wrapper.text()).toContain('Invalid credentials');
    expect(mocks.userStore.isAuthenticated).toBe(false);
  });

  it('completes SSO callback success and redirects after timeout', async () => {
    vi.useFakeTimers();
    mocks.guestGet.mockResolvedValue({
      data: {
        data: {
          id: 'u-1',
          email: 'user@example.com',
          firstName: 'User',
          lastName: 'One',
          failedLogins: 0,
        },
      },
    });

    const router = await createTestRouter(
      '/auth/sso/callback?next=%2Fevidence',
    );
    const replaceSpy = vi.spyOn(router, 'replace');

    mount(SSOCallbackView, {
      global: {
        plugins: [router],
        stubs: {
          AuthPanelCard: authComponentStub,
        },
      },
    });

    await flushAsync();

    expect(mocks.userStore.isAuthenticated).toBe(true);
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Welcome back',
      }),
    );

    vi.advanceTimersByTime(2500);
    await flushAsync();
    expect(replaceSpy).toHaveBeenCalledWith({ path: '/evidence' });
  });

  it('handles SSO callback failure and returns to login after timeout', async () => {
    vi.useFakeTimers();
    mocks.guestGet.mockRejectedValue(new Error('timeout'));
    const router = await createTestRouter(
      '/auth/sso/callback?next=%2Fevidence',
    );
    const replaceSpy = vi.spyOn(router, 'replace');

    const wrapper = mount(SSOCallbackView, {
      global: {
        plugins: [router],
        stubs: {
          AuthPanelCard: authComponentStub,
        },
      },
    });

    await flushAsync();

    expect(wrapper.text()).toContain('We could not complete your SSO sign-in');
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'SSO Login Failed',
      }),
    );

    vi.advanceTimersByTime(4000);
    await flushAsync();
    expect(replaceSpy).toHaveBeenCalledWith({ name: 'login' });
  });
});
