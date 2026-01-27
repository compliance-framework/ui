import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const mockExecute = vi.fn().mockResolvedValue({});
const mockData = shallowRef(undefined);
const mockIsLoading = ref(false);

const mockUseDataApi = vi.fn().mockReturnValue({
  data: mockData,
  isLoading: mockIsLoading,
  execute: mockExecute,
});

vi.mock('@/composables/axios', () => ({
  useDataApi: (...args: unknown[]) => mockUseDataApi(...args),
  decamelizeKeys: vi.fn((data: unknown) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
    remove: vi.fn(),
  }),
}));

import LocalDefinitionsForm from '../poam/LocalDefinitionsForm.vue';

describe('LocalDefinitionsForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockData.value = undefined;
    mockIsLoading.value = false;
  });

  const mountForm = (props?: { localDefinitions?: object }) => {
    return mount(LocalDefinitionsForm, {
      props: {
        poamId: 'test-poam-id',
        ...props,
      },
    });
  };

  describe('API URL', () => {
    it('uses the correct API URL (singular plan-of-action-and-milestones)', () => {
      mountForm();

      const url = mockUseDataApi.mock.calls[0][0];
      expect(url).toBe(
        '/api/oscal/plan-of-action-and-milestones/test-poam-id/local-definitions',
      );
      expect(url).not.toContain('plan-of-actions-and-milestones');
    });
  });

  describe('Form submission - always uses PUT', () => {
    it('uses PUT when creating new local definitions (no existing data)', async () => {
      mockData.value = {
        components: [],
        inventoryItems: [],
        remarks: '',
      } as never;

      const wrapper = mountForm();
      await wrapper.find('form').trigger('submit');

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('uses PUT when editing existing local definitions', async () => {
      const existing = {
        components: [
          {
            uuid: 'comp-1',
            title: 'Existing',
            type: 'software',
            status: { state: 'operational' },
          },
        ],
        inventoryItems: [],
        remarks: 'test',
      };

      mockData.value = existing as never;

      const wrapper = mountForm({ localDefinitions: existing });
      await wrapper.find('form').trigger('submit');

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('never uses POST', async () => {
      mockData.value = {
        components: [],
        inventoryItems: [],
        remarks: '',
      } as never;

      const wrapper = mountForm();
      await wrapper.find('form').trigger('submit');

      expect(mockExecute).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('Form button label', () => {
    it('shows "Create" when no existing local definitions', () => {
      const wrapper = mountForm();

      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.text()).toBe('Create');
    });

    it('shows "Update" when editing existing local definitions', () => {
      const wrapper = mountForm({
        localDefinitions: { components: [], inventoryItems: [], remarks: '' },
      });

      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.text()).toBe('Update');
    });
  });

  describe('Form data cleanup on submit', () => {
    it('filters out components missing required fields before submit', async () => {
      mockData.value = {
        components: [],
        inventoryItems: [],
        remarks: '',
      } as never;

      const wrapper = mountForm();

      // Add a component with missing fields via the button
      const addBtn = wrapper
        .findAll('button[type="button"]')
        .find((b) => b.text().includes('Add Component'));
      await addBtn!.trigger('click');

      // Submit — the empty component should be filtered out
      await wrapper.find('form').trigger('submit');

      expect(mockExecute).toHaveBeenCalled();
      const callData = mockExecute.mock.calls[0][0].data;
      expect(callData.components).toHaveLength(0);
    });
  });
});
