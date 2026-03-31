<template>
  <Dialog
    v-model:visible="localVisible"
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
            Planned Completion Date
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
        <div class="relative">
          <AutoComplete
            v-model="selectedUser"
            :suggestions="userSuggestions"
            @complete="searchUsers"
            @update:modelValue="onUserSelect"
            optionLabel="displayName"
            placeholder="Search for a user by name or email..."
            class="w-full"
            :forceSelection="true"
          >
            <template #item="slotProps">
              <div class="flex items-center gap-2">
                <UserAvatar
                  :user="{
                    displayName: slotProps.item.displayName,
                    fallbackInitials: '?',
                  }"
                  size="sm"
                />
                <div class="flex flex-col">
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    {{ slotProps.item.displayName }}
                  </span>
                  <span
                    v-if="slotProps.item.email"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ slotProps.item.email }}
                  </span>
                </div>
              </div>
            </template>
          </AutoComplete>
        </div>
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
          @click="localVisible = false"
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
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import UserAvatar from '@/components/workflows/UserAvatar.vue';
import {
  useUserSearch,
  type DisplayUser,
} from '@/composables/workflows/useUserSearch';
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

const localVisible = ref(props.modelValue);
const isEdit = ref(false);

// Derive saving and saveError from props so the parent controls modal state
const saving = computed(() => props.saving);
const saveError = computed(() => props.saveError ?? '');

const { searchUsers, userSuggestions, loadUsersByIds, getCachedUser } =
  useUserSearch();
const selectedUser = ref<DisplayUser | null>(null);

function onUserSelect(user: DisplayUser | null) {
  selectedUser.value = user;
  form.value.responsibleParty = user ? user.id : '';
}

interface FormState {
  title: string;
  description: string;
  status: MilestoneStatus;
  plannedCompletionDate?: string;
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
    localVisible.value = val;
  },
);

watch(localVisible, (val) => {
  emit('update:modelValue', val);
});

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
      if (m.responsibleParty) {
        // Pre-load user info if we have an ID
        loadUsersByIds([m.responsibleParty]).then(() => {
          const u = getCachedUser(m.responsibleParty!);
          if (u) selectedUser.value = u;
        });
      } else {
        selectedUser.value = null;
      }
    } else {
      isEdit.value = false;
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  isEdit.value = false;
  errors.value = {};
  selectedUser.value = null;
  form.value = {
    title: '',
    description: '',
    status: 'open',
    plannedCompletionDate: '',
    responsibleParty: '',
    remarks: '',
  };
}

function validate(): boolean {
  errors.value = {};
  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required';
  }
  return Object.keys(errors.value).length === 0;
}

function submit() {
  if (!validate()) return;

  const payload: CreateMilestoneRequest | UpdateMilestoneRequest = {
    title: form.value.title.trim(),
    description: form.value.description.trim() || undefined,
    status: form.value.status,
    plannedCompletionDate: form.value.plannedCompletionDate || undefined,
    responsibleParty: form.value.responsibleParty.trim() || undefined,
    remarks: form.value.remarks.trim() || undefined,
  };

  // Emit the payload to the parent; the parent is responsible for calling the
  // API and closing the modal (or passing back a saveError) so that the user
  // does not lose their input if the API call fails.
  emit('saved', payload);
}
</script>
