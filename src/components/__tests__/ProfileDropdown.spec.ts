import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import ProfileDropdown from '../ProfileDropdown.vue';

// Mock all the dependencies
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      },
    }),
    post: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('@/stores/auth', () => ({
  useUserStore: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
    remove: vi.fn(),
  }),
}));

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/preferences',
      name: 'preferences',
      component: { template: '<div></div>' },
    },
    { path: '/login', name: 'login', component: { template: '<div></div>' } },
  ],
});

describe('ProfileDropdown', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the profile button', () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      expect(button.attributes('aria-expanded')).toBe('false');
      expect(button.attributes('aria-haspopup')).toBe('true');
    });

    it('shows user initials as U when no user data', () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      const initials = wrapper.find('.bg-blue-500');
      expect(initials.text()).toBe('U');
    });
  });

  describe('Dropdown Toggle', () => {
    it('opens dropdown when button is clicked', async () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      const button = wrapper.find('button');
      await button.trigger('click');

      expect(wrapper.vm.isOpen).toBe(true);
      expect(button.attributes('aria-expanded')).toBe('true');

      const menu = wrapper.find('[role="menu"]');
      expect(menu.exists()).toBe(true);
    });

    it('closes dropdown when button is clicked again', async () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      const button = wrapper.find('button');
      await button.trigger('click'); // Open
      await button.trigger('click'); // Close

      expect(wrapper.vm.isOpen).toBe(false);
      expect(button.attributes('aria-expanded')).toBe('false');
    });
  });

  describe('Component State', () => {
    it('has correct initial state', () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      expect(wrapper.vm.isOpen).toBe(false);
      expect(wrapper.vm.user).toBeNull();
      expect(wrapper.vm.currentFocusedIndex).toBe(-1);
    });

    it('has keyboard event handler defined', () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      expect(typeof wrapper.vm.handleKeyDown).toBe('function');
    });
  });

  describe('User Initials', () => {
    it('computes initials correctly for user with names', async () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      // Simulate setting user data
      wrapper.vm.user = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      await wrapper.vm.$nextTick();
      const initials = wrapper.find('.bg-blue-500');
      expect(initials.text()).toBe('JD');
    });

    it('handles empty names gracefully', async () => {
      wrapper = mount(ProfileDropdown, {
        global: {
          plugins: [router],
          stubs: {
            'router-link': true,
          },
        },
      });

      // Simulate setting user data with empty names
      wrapper.vm.user = {
        firstName: '',
        lastName: '',
        email: 'user@example.com',
      };

      await wrapper.vm.$nextTick();
      const initials = wrapper.find('.bg-blue-500');
      expect(initials.text()).toBe('U');
    });
  });
});
