<template>
  <Dialog
    v-model:visible="visible"
    :header="isEdit ? 'Edit Milestone' : 'Add Milestone'"
    modal
    :style="{ width: '560px' }"
    @hide="resetForm"
  >
    <div class="space-y-4 py-2">
      <!-- Title -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Title <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.title"
          type="text"
          placeholder="e.g. Deploy patch to production"
          class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': errors.title }"
        />
        <p v-if="errors.title" class="text-xs text-red-500 mt-1">
          {{ errors.title }}
        </p>
      </div>

      <!-- Description -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Description
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="Describe what needs to be done for this milestone"
          class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Status + Planned Completion Date (side by side) -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Status
          </label>
          <select
            v-model="form.status"
            class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Planned Completion Date <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.plannedCompletionDate"
            type="date"
            class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            :class="{ 'border-red-500': errors.plannedCompletionDate }"
          />
          <p
            v-if="errors.plannedCompletionDate"
            class="text-xs text-red-500 mt-1"
          >
            {{ errors.plannedCompletionDate }}
          </p>
        </div>
      </div>

      <!-- Responsible Party -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Responsible Party
        </label>
        <input
          v-model="form.responsibleParty"
          type="text"
          placeholder="e.g. Security Team, John Smith"
          class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Remarks -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Remarks
        </label>
        <textarea
          v-model="form.remarks"
          rows="2"
          placeholder="Any additional notes or context"
          class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Info banner when editing and marking complete -->
      <div
        v-if="isEdit && form.status === 'completed'"
        class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
      >
        <svg
          class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-xs text-blue-700 dark:text-blue-300">
          Setting status to <strong>Completed</strong> will automatically record
          a completion timestamp.
        </p>
      </div>

      <!-- Save error banner -->
      <div
        v-if="saveError"
        class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
      >
        <p class="text-xs text-red-700 dark:text-red-300">{{ saveError }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <button
          @click="visible = false"
          :disabled="saving"
          class="px-4 py-2 text-sm border border-ccf-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          @click="submit"
          :disabled="saving"
          class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Milestone' }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import type {
  PoamItemMilestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  MilestoneStatus,
} from '@/types/poam-items';

interface Props {
  modelValue: boolean;
  milestone?: PoamItemMilestone | null;
  /** Pass true while the parent is executing the API call to keep the modal in saving state */
  saving?: boolean;
  /** Pass an error message from the parent if the API call fails */
  saveError?: string;
}

const props = withDefaults(defineProps<Props>(), {
  milestone: null,
  saving: false,
  saveError: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [payload: CreateMilestoneRequest | UpdateMilestoneRequest];
}>();

const visible = ref(props.modelValue);
const saving = ref(false);
const isEdit = ref(false);
const saveError = ref('');

interface FormState {
  title: string;
  description: string;
  status: MilestoneStatus;
  plannedCompletionDate: string;
  responsibleParty: string;
  remarks: string;
}

const form = ref<FormState>({
  title: '',
  description: '',
  status: 'open',
  plannedCompletionDate: '',
  responsibleParty: '',
  remarks: '',
});

const errors = ref<Partial<Record<keyof FormState, string>>>({});

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
  },
);

watch(visible, (val) => {
  emit('update:modelValue', val);
  if (!val) {
    saveError.value = '';
  }
});

// Sync external saving state from parent
watch(
  () => props.saving,
  (val) => {
    saving.value = val;
  },
);

// Sync external save error from parent
watch(
  () => props.saveError,
  (val) => {
    saveError.value = val ?? '';
  },
);

watch(
  () => props.milestone,
  (m) => {
    if (m) {
      isEdit.value = true;
      form.value = {
        title: m.title,
        description: m.description ?? '',
        status: m.status,
        plannedCompletionDate: m.plannedCompletionDate
          ? m.plannedCompletionDate.substring(0, 10)
          : '',
        responsibleParty: m.responsibleParty ?? '',
        remarks: m.remarks ?? '',
      };
    } else {
      isEdit.value = false;
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  form.value = {
    title: '',
    description: '',
    status: 'open',
    plannedCompletionDate: '',
    responsibleParty: '',
    remarks: '',
  };
  errors.value = {};
  saveError.value = '';
}

function validate(): boolean {
  errors.value = {};
  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required';
  }
  if (!form.value.plannedCompletionDate) {
    errors.value.plannedCompletionDate = 'Planned completion date is required';
  }
  return Object.keys(errors.value).length === 0;
}

function submit() {
  if (!validate()) return;

  const payload: CreateMilestoneRequest | UpdateMilestoneRequest = {
    title: form.value.title.trim(),
    description: form.value.description.trim() || undefined,
    status: form.value.status,
    plannedCompletionDate: form.value.plannedCompletionDate,
    responsibleParty: form.value.responsibleParty.trim() || undefined,
    remarks: form.value.remarks.trim() || undefined,
  };

  // Emit the payload to the parent; the parent is responsible for calling the
  // API and closing the modal (or passing back a saveError) so that the user
  // does not lose their input if the API call fails.
  emit('saved', payload);
}
</script>
