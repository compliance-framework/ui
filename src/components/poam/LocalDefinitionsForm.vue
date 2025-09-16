<template>
  <div class="p-6">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Components Section -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
        >
          Components
        </label>
        <div class="space-y-4">
          <div
            v-for="(component, index) in formData.components || []"
            :key="index"
            class="border border-gray-300 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-center mb-3">
              <span class="font-medium text-gray-900 dark:text-slate-300"
                >Component {{ index + 1 }}</span
              >
              <button
                type="button"
                @click="removeComponent(index)"
                class="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
                >
                  Title *
                </label>
                <input
                  v-model="component.title"
                  type="text"
                  placeholder="Component title"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
                />
              </div>

              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
                >
                  Type *
                </label>
                <select
                  v-model="component.type"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
                >
                  <option value="">Select type</option>
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                  <option value="service">Service</option>
                  <option value="policy">Policy</option>
                  <option value="process">Process</option>
                  <option value="procedure">Procedure</option>
                  <option value="plan">Plan</option>
                  <option value="guidance">Guidance</option>
                  <option value="standard">Standard</option>
                  <option value="validation">Validation</option>
                </select>
              </div>
            </div>

            <div class="mt-3">
              <label
                class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
              >
                Description
              </label>
              <textarea
                v-model="component.description"
                rows="2"
                placeholder="Component description"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
              />
            </div>

            <div class="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
                >
                  Status State *
                </label>
                <select
                  v-model="component.status.state"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
                >
                  <option value="">Select state</option>
                  <option value="operational">Operational</option>
                  <option value="under-development">Under Development</option>
                  <option value="under-major-modification">
                    Under Major Modification
                  </option>
                  <option value="disposition">Disposition</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
                >
                  Status Reason
                </label>
                <input
                  v-model="component.status.reason"
                  type="text"
                  placeholder="Status reason"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
                />
              </div>
            </div>

            <div class="mt-3">
              <label
                class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
              >
                Remarks
              </label>
              <textarea
                v-model="component.remarks"
                rows="2"
                placeholder="Component remarks"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
              />
            </div>
          </div>

          <button
            type="button"
            @click="addComponent"
            class="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Add Component
          </button>
        </div>
      </div>

      <!-- Inventory Items Section -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
        >
          Inventory Items
        </label>
        <div class="space-y-4">
          <div
            v-for="(item, index) in formData.inventoryItems || []"
            :key="index"
            class="border border-gray-300 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-center mb-3">
              <span class="font-medium text-gray-900 dark:text-slate-300"
                >Inventory Item {{ index + 1 }}</span
              >
              <button
                type="button"
                @click="removeInventoryItem(index)"
                class="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>

            <div>
              <label
                class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
              >
                Description *
              </label>
              <textarea
                v-model="item.description"
                rows="2"
                placeholder="Inventory item description"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
              />
            </div>

            <div class="mt-3">
              <label
                class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
              >
                Remarks
              </label>
              <textarea
                v-model="item.remarks"
                rows="2"
                placeholder="Inventory item remarks"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
              />
            </div>
          </div>

          <button
            type="button"
            @click="addInventoryItem"
            class="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Add Inventory Item
          </button>
        </div>
      </div>

      <!-- Assessment Assets Section -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
        >
          Assessment Assets
        </label>
        <div
          class="border border-gray-300 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-800"
        >
          <div>
            <label
              class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"
            >
              Components
            </label>
            <div class="space-y-2">
              <div
                v-for="(component, index) in formData.assessmentAssets
                  ?.components || []"
                :key="index"
                class="flex gap-2 items-center"
              >
                <input
                  v-model="component.title"
                  type="text"
                  placeholder="Assessment component title"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
                />
                <button
                  type="button"
                  @click="removeAssessmentComponent(index)"
                  class="px-3 py-2 text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <button
                type="button"
                @click="addAssessmentComponent"
                class="text-blue-600 hover:text-blue-700 text-sm"
              >
                + Add Assessment Component
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Remarks Section -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
        >
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="4"
          placeholder="Enter remarks..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md"
        >
          {{ loading ? 'Saving...' : localDefinitions ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { POAMLocalDefinitions } from '@/stores/plan-of-action-and-milestones';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

interface Props {
  poamId: string;
  localDefinitions?: POAMLocalDefinitions;
}

interface Emits {
  (e: 'cancel'): void;
  (e: 'saved', localDefinitions: POAMLocalDefinitions): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const toast = useToast();

const {
  data: newLD,
  isLoading: loading,
  execute: saveLD,
} = useDataApi<POAMLocalDefinitions>(
  `/api/oscal/plan-of-actions-and-milestones/${props.poamId}/local-definitions`,
  null,
  { immediate: false },
);

const formData = ref<POAMLocalDefinitions>({
  components: [],
  inventoryItems: [],
  assessmentAssets: {
    components: [],
  },
  remarks: '',
});

onMounted(() => {
  if (props.localDefinitions) {
    formData.value = {
      components: [...(props.localDefinitions.components || [])],
      inventoryItems: [...(props.localDefinitions.inventoryItems || [])],
      assessmentAssets: {
        components: [
          ...(props.localDefinitions.assessmentAssets?.components || []),
        ],
      },
      remarks: props.localDefinitions.remarks || '',
    };
  }
});

function generateUUID(): string {
  return crypto.randomUUID();
}

function addComponent() {
  if (!formData.value.components) {
    formData.value.components = [];
  }
  formData.value.components.push({
    uuid: generateUUID(),
    title: '',
    type: '',
    description: '',
    status: {
      state: '',
      reason: '',
      remarks: '',
    },
    remarks: '',
  });
}

function removeComponent(index: number) {
  formData.value.components?.splice(index, 1);
}

function addInventoryItem() {
  if (!formData.value.inventoryItems) {
    formData.value.inventoryItems = [];
  }
  formData.value.inventoryItems.push({
    uuid: generateUUID(),
    description: '',
    remarks: '',
  });
}

function removeInventoryItem(index: number) {
  formData.value.inventoryItems?.splice(index, 1);
}

function addAssessmentComponent() {
  if (!formData.value.assessmentAssets) {
    formData.value.assessmentAssets = { components: [] };
  }
  if (!formData.value.assessmentAssets.components) {
    formData.value.assessmentAssets.components = [];
  }
  formData.value.assessmentAssets.components.push({
    uuid: generateUUID(),
    title: '',
    type: '',
    description: '',
    status: {
      state: '',
      reason: '',
      remarks: '',
    },
    remarks: '',
  });
}

function removeAssessmentComponent(index: number) {
  formData.value.assessmentAssets?.components?.splice(index, 1);
}

async function handleSubmit() {
  try {
    // Clean up empty items
    if (formData.value.components) {
      formData.value.components = formData.value.components.filter(
        (c) => c.title && c.type && c.status?.state,
      );
    }
    if (formData.value.inventoryItems) {
      formData.value.inventoryItems = formData.value.inventoryItems.filter(
        (i) => i.description,
      );
    }
    if (formData.value.assessmentAssets?.components) {
      formData.value.assessmentAssets.components =
        formData.value.assessmentAssets.components.filter((c) => c.title);
    }

    if (props.localDefinitions) {
      await saveLD({
        data: formData.value,
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      });
    } else {
      await saveLD({
        data: formData.value,
        method: 'POST',
        transformRequest: [decamelizeKeys],
      });
    }

    emit('saved', newLD.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorMessage =
      errorResponse.response?.data.errors?.body ||
      'An unexpected error occurred';
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: `Failed to save local definitions: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
