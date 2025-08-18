<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      {{ isEditing ? 'Edit System ID' : 'Create System ID' }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Identifier
        </label>
        <input
          v-model="formData.identifier"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter system identifier"
        />
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          The system identifier (e.g., system name, ID, or URI)
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Identifier Type
        </label>
        <input
          v-model="formData.identifierType"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter identifier type (optional)"
        />
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          The type of identifier (e.g., 'system-name', 'uri', etc.)
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Optional remarks about the system ID"
        ></textarea>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Optional remarks about the system identifier
        </p>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Saving...' : isEditing ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import type { SystemId } from '@/stores/plan-of-action-and-milestones.ts';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const props = defineProps<{
  poamId: string;
  systemId?: SystemId;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [systemId: SystemId];
}>();

const toast = useToast();
const isEditing = computed(() => !!props.systemId);

const {
  data: systemId,
  isLoading: saving,
  execute: saveSystemId,
} = useDataApi<SystemId>(
  `/api/oscal/plan-of-action-and-milestones/${props.poamId}/system-id`,
  null,
  { immediate: false },
);

const formData = reactive({
  identifier: '',
  identifierType: '',
  remarks: '',
});

onMounted(() => {
  if (props.systemId) {
    // Handle both id and identifier fields from backend
    formData.identifier = props.systemId.identifier || props.systemId.id || '';
    formData.identifierType = props.systemId.identifierType || '';
    formData.remarks = props.systemId.remarks || '';
  }
});

async function handleSubmit() {
  try {
    const systemIdData: SystemId = {
      id: formData.identifier.trim() || undefined,
      identifierType: formData.identifierType.trim() || undefined,
      remarks: formData.remarks.trim() || undefined,
    };

    if (isEditing.value) {
      await saveSystemId({
        method: 'PUT',
        data: systemIdData,
        transformRequest: [decamelizeKeys],
      });
    } else {
      await saveSystemId({
        method: 'POST',
        data: systemIdData,
        transformRequest: [decamelizeKeys],
      });
    }

    toast.add({
      severity: 'success',
      summary: isEditing.value ? 'System ID Updated' : 'System ID Created',
      detail: 'System ID data saved successfully',
      life: 3000,
    });

    emit('saved', systemId.value!);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: `Failed to save system ID: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
