import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

// Shared mock state that tests can manipulate
const mockData = shallowRef(undefined);
const mockError = ref(null);
const mockIsLoading = ref(false);

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: mockData,
    error: mockError,
    isLoading: mockIsLoading,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'test-poam-id' },
  }),
}));

vi.mock('@/volt/Dialog.vue', () => ({
  default: {
    name: 'Dialog',
    template: '<div class="dialog"><slot /></div>',
    props: ['visible', 'size', 'modal', 'header'],
  },
}));

vi.mock('@/components/poam/LocalDefinitionsForm.vue', () => ({
  default: {
    name: 'LocalDefinitionsForm',
    template: '<div class="local-definitions-form" />',
    props: ['poamId', 'localDefinitions'],
    emits: ['cancel', 'saved'],
  },
}));

import PlanOfActionAndMilestonesLocalDefinitionsView from '../plan-of-actions-and-milestones/PlanOfActionAndMilestonesLocalDefinitionsView.vue';

describe('PlanOfActionAndMilestonesLocalDefinitionsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockData.value = undefined;
    mockError.value = null;
    mockIsLoading.value = false;
  });

  describe('Loading state', () => {
    it('shows loading message when data is loading', () => {
      mockIsLoading.value = true;

      const wrapper = mount(PlanOfActionAndMilestonesLocalDefinitionsView);

      expect(wrapper.text()).toContain('Loading local definitions data...');
    });
  });

  describe('Error handling', () => {
    it('shows error message for non-404 errors', () => {
      mockError.value = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as never;

      const wrapper = mount(PlanOfActionAndMilestonesLocalDefinitionsView);

      expect(wrapper.text()).toContain('Error loading local definitions data');
    });

    it('does NOT show error for 404 responses', () => {
      mockError.value = {
        response: { status: 404 },
        message: 'Not Found',
      } as never;

      const wrapper = mount(PlanOfActionAndMilestonesLocalDefinitionsView);

      expect(wrapper.text()).not.toContain('Error loading local definitions');
      // Should show the empty/create state instead
      expect(wrapper.text()).toContain('No local definitions data available');
    });

    it('does NOT show error for 404 and shows create button', () => {
      mockError.value = {
        response: { status: 404 },
        message: 'Not Found',
      } as never;

      const wrapper = mount(PlanOfActionAndMilestonesLocalDefinitionsView);

      const createBtn = wrapper.find('button');
      expect(createBtn.exists()).toBe(true);
      expect(createBtn.text()).toContain('Create');
    });
  });

  describe('Empty state', () => {
    it('shows empty state with create button when no data', () => {
      mockData.value = undefined;

      const wrapper = mount(PlanOfActionAndMilestonesLocalDefinitionsView);

      expect(wrapper.text()).toContain('No local definitions data available');
    });
  });

  describe('Data display', () => {
    it('renders components when local definitions have components', () => {
      mockData.value = {
        components: [
          {
            uuid: 'comp-1',
            title: 'Test Component',
            type: 'software',
            description: 'A test component',
            status: { state: 'operational' },
          },
        ],
      } as never;

      const wrapper = mount(PlanOfActionAndMilestonesLocalDefinitionsView);

      expect(wrapper.text()).toContain('Test Component');
      expect(wrapper.text()).toContain('software');
      expect(wrapper.text()).toContain('operational');
    });
  });
});
