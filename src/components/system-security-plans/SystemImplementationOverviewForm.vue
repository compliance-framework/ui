<template>
  <div class="px-6 py-4">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">
        System Implementation Overview
      </h3>
      <div class="flex gap-2">
        <button
          v-if="!isEditing"
          type="button"
          @click="startEditing"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Edit
        </button>
        <template v-if="isEditing">
          <button
            type="button"
            @click="cancelEditing"
            class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="saveOverview"
            :disabled="saving"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </template>
      </div>
    </div>

    <form @submit.prevent="saveOverview()">
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea
          v-model="overviewData.remarks"
          :disabled="!isEditing"
          placeholder="Describe the system implementation and any additional remarks"
          :class="{ 'bg-gray-100 dark:bg-gray-800': !isEditing }"
        />
      </div>

      <!-- Properties Section -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
        <div class="space-y-2">
          <div
            v-for="(prop, index) in overviewData.props || []"
            :key="index"
            class="flex gap-2"
          >
            <FormInput
              v-model="prop.name"
              :disabled="!isEditing"
              placeholder="Property name"
              class="flex-1"
              :class="{ 'bg-gray-100 dark:bg-gray-800': !isEditing }"
            />
            <FormInput
              v-model="prop.value"
              :disabled="!isEditing"
              placeholder="Property value"
              class="flex-1"
              :class="{ 'bg-gray-100 dark:bg-gray-800': !isEditing }"
            />
            <button
              v-if="isEditing"
              type="button"
              @click="removeProperty(index)"
              class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
          <button
            v-if="isEditing"
            type="button"
            @click="addProperty"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Property
          </button>
        </div>
      </div>

      <!-- Links Section -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Links</label>
        <div class="space-y-2">
          <div
            v-for="(link, index) in overviewData.links || []"
            :key="index"
            class="flex gap-2"
          >
            <FormInput
              v-model="link.href"
              :disabled="!isEditing"
              placeholder="Link URL"
              class="flex-1"
              :class="{ 'bg-gray-100 dark:bg-gray-800': !isEditing }"
            />
            <FormInput
              v-model="link.text"
              :disabled="!isEditing"
              placeholder="Link text"
              class="flex-1"
              :class="{ 'bg-gray-100 dark:bg-gray-800': !isEditing }"
            />
            <FormInput
              v-model="link.rel"
              :disabled="!isEditing"
              placeholder="Relationship"
              class="flex-1"
              :class="{ 'bg-gray-100 dark:bg-gray-800': !isEditing }"
            />
            <button
              v-if="isEditing"
              type="button"
              @click="removeLink(index)"
              class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
          <button
            v-if="isEditing"
            type="button"
            @click="addLink"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Link
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import type { SystemImplementation } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  systemImplementation: SystemImplementation | null;
}>();

const emit = defineEmits<{
  saved: [systemImplementation: SystemImplementation];
}>();

const toast = useToast();
const isEditing = ref(false);

const {
  data: updatedSystemImplementation,
  execute: executeUpdate,
  isLoading: saving,
} = useDataApi<SystemImplementation>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation`,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const overviewData = reactive<SystemImplementation>({
  remarks: undefined,
  props: [],
  links: [],
});

// Store original data for cancel functionality
const originalData = reactive<SystemImplementation>({
  remarks: undefined,
  props: [],
  links: [],
});

const loadData = (data: SystemImplementation | null) => {
  if (data) {
    // Only extract the fields that belong in SystemImplementation
    const newData: SystemImplementation = {
      remarks: data.remarks,
      props: [...(data.props || [])].map((p) => ({ ...p })),
      links: [...(data.links || [])].map((l) => ({ ...l })),
    };

    Object.assign(overviewData, newData);
    Object.assign(originalData, {
      remarks: newData.remarks,
      props: [...(newData.props || [])].map((p) => ({ ...p })),
      links: [...(newData.links || [])].map((l) => ({ ...l })),
    });
  }
};

onMounted(() => {
  loadData(props.systemImplementation);
});

// Watch for changes to the systemImplementation prop
watch(
  () => props.systemImplementation,
  (newValue) => {
    if (newValue && !isEditing.value) {
      loadData(newValue);
    }
  },
  { immediate: false },
);

const startEditing = () => {
  isEditing.value = true;
  // Store current data as original for potential cancel
  Object.assign(originalData, {
    remarks: overviewData.remarks,
    props: [...(overviewData.props || [])].map((p) => ({ ...p })),
    links: [...(overviewData.links || [])].map((l) => ({ ...l })),
  });
};

const cancelEditing = () => {
  isEditing.value = false;
  // Restore original data
  Object.assign(overviewData, {
    remarks: originalData.remarks,
    props: [...(originalData.props || [])].map((p) => ({ ...p })),
    links: [...(originalData.links || [])].map((l) => ({ ...l })),
  });

  toast.add({
    severity: 'info',
    summary: 'Cancelled',
    detail: 'Changes have been discarded.',
    life: 3000,
  });
};

const addProperty = () => {
  if (!overviewData.props) overviewData.props = [];
  overviewData.props.push({
    name: '',
    value: '',
  });
};

const removeProperty = (index: number) => {
  if (overviewData.props) {
    overviewData.props.splice(index, 1);
  }
};

const addLink = () => {
  if (!overviewData.links) overviewData.links = [];
  overviewData.links.push({
    href: '',
    text: '',
    rel: '',
  });
};

const removeLink = (index: number) => {
  if (overviewData.links) {
    overviewData.links.splice(index, 1);
  }
};

const saveOverview = async () => {
  if (!isEditing.value) return;

  try {
    // Only send the fields that belong in SystemImplementation
    const dataToSave: SystemImplementation = {
      remarks: overviewData.remarks,
      props: overviewData.props || [],
      links: overviewData.links || [],
    };

    await executeUpdate({
      data: dataToSave,
    });

    // Update both current and original data with saved response
    loadData(updatedSystemImplementation.value!);
    isEditing.value = false;

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'System implementation overview updated successfully.',
      life: 3000,
    });

    emit('saved', updatedSystemImplementation.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data.errors.body ||
        'An unknown error occurred.',
      life: 5000,
    });
  }
};
</script>
