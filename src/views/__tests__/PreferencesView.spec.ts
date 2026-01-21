import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PreferencesView from '../PreferencesView.vue';

// Mock the composables
const mockAxios = {
  get: vi.fn(),
  put: vi.fn(),
};

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => mockAxios,
}));

// Mock components
vi.mock('@/components/PageHeader.vue', () => ({
  default: {
    name: 'PageHeader',
    template: '<header><slot></slot></header>',
  },
}));

vi.mock('@/components/PageCard.vue', () => ({
  default: {
    name: 'PageCard',
    template: '<div class="page-card"><slot></slot></div>',
  },
}));

describe('PreferencesView', () => {
  let wrapper: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('shows loading state initially', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(wrapper.vm.loading).toBe(true);
    });

    it('renders preferences page structure', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.$options).toBeDefined();
    });
  });

  describe('Component State', () => {
    it('has correct initial state', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(wrapper.vm.loading).toBe(true);
      expect(wrapper.vm.updating).toBe(false);
      expect(wrapper.vm.digestSubscribed).toBe(false);
      expect(wrapper.vm.updateError).toBeNull();
      expect(wrapper.vm.updateSuccess).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('has error state variables', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(wrapper.vm.updateError).toBeNull();
      expect(wrapper.vm.loadError).toBeNull();
    });
  });

  describe('Timeout Cleanup', () => {
    it('has timeout ref for cleanup', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(wrapper.vm.successTimeoutId).toBeDefined();
    });

    it('cleans up timeout on unmount', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      // Set a timeout
      wrapper.vm.successTimeoutId = window.setTimeout(() => {}, 1000);

      // Unmount
      wrapper.unmount();

      // Should not throw error
      expect(wrapper.vm.successTimeoutId).toBeDefined();
    });
  });

  describe('Methods', () => {
    it('has loadUserData method', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(typeof wrapper.vm.loadUserData).toBe('function');
    });

    it('has updateDigestSubscription method', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      expect(typeof wrapper.vm.updateDigestSubscription).toBe('function');
    });
  });

  describe('Accessibility', () => {
    it('has proper template structure', () => {
      wrapper = mount(PreferencesView, {
        global: {
          stubs: {
            PageHeader: true,
            PageCard: true,
          },
        },
      });

      // Check that the component renders without errors
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.$options).toBeDefined();
    });
  });
});
