<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
        Remediations
      </h3>
      <button
        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
        @click="startCreate"
        :disabled="saving"
      >
        Add Remediation
      </button>
    </div>

    <div
      v-if="!risk?.remediations?.length"
      class="text-sm text-gray-600 dark:text-slate-400"
    >
      No remediation responses recorded for this risk.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(remediation, index) in risk.remediations"
        :key="remediation.uuid || index"
        class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-3"
      >
        <div class="flex justify-between items-start">
          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-slate-200">
              {{ remediation.title }}
            </h4>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              Lifecycle: {{ remediation.lifecycle }}
            </div>
            <div class="text-sm text-gray-700 dark:text-slate-300">
              {{ remediation.description }}
            </div>
            <div
              v-if="remediation.remarks"
              class="text-xs text-gray-500 dark:text-slate-400"
            >
              Remarks: {{ remediation.remarks }}
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs"
              @click="startEdit(index)"
              :disabled="saving"
            >
              Edit
            </button>
            <button
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs"
              @click="removeRemediation(index)"
              :disabled="saving"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showEditor" modal :header="editorTitle" size="lg">
      <div class="space-y-4">
        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Title
          </label>
          <input
            v-model="working.title"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Lifecycle
          </label>
          <select
            v-model="working.lifecycle"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Select lifecycle</option>
            <option
              v-for="option in lifecycleOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Description
          </label>
          <textarea
            v-model="working.description"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
          ></textarea>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Remarks (optional)
          </label>
          <textarea
            v-model="working.remarks"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
          ></textarea>
        </div>

        <p class="text-xs text-gray-500 dark:text-slate-400">
          Tasks and required assets can be managed in a future iteration.
        </p>

        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="px-3 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 text-sm"
            @click="closeEditor"
            :disabled="saving"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            @click="saveRemediation"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import { useToast } from 'primevue/usetoast';
import type { Response, Risk } from '@/oscal';
import { cloneFnJSON as cloneDeep } from '@vueuse/core';

const props = defineProps<{
  risk: Risk | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [responses: Response[]];
}>();

interface EditableRemediation {
  uuid?: string;
  title: string;
  lifecycle: string;
  description: string;
  remarks?: string;
}

const lifecycleOptions = ['recommendation', 'planned', 'completed'];

const toast = useToast();

const showEditor = ref(false);
const editingIndex = ref<number | null>(null);
const working = reactive<EditableRemediation>({
  title: '',
  lifecycle: '',
  description: '',
  remarks: '',
});

const editorTitle = computed(() =>
  editingIndex.value === null ? 'Add Remediation' : 'Edit Remediation',
);

function resetWorking() {
  working.uuid = undefined;
  working.title = '';
  working.lifecycle = '';
  working.description = '';
  working.remarks = '';
}

function startCreate() {
  resetWorking();
  editingIndex.value = null;
  showEditor.value = true;
}

function startEdit(index: number) {
  if (!props.risk?.remediations?.[index]) return;
  const remediation = props.risk.remediations[index];
  editingIndex.value = index;
  working.uuid = remediation.uuid;
  working.title = remediation.title;
  working.lifecycle = remediation.lifecycle;
  working.description = remediation.description;
  working.remarks = remediation.remarks ?? '';
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
  resetWorking();
}

function saveRemediation() {
  if (!props.risk) return;

  if (!working.title.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title is required.',
      life: 3000,
    });
    return;
  }

  if (!working.lifecycle.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Lifecycle is required.',
      life: 3000,
    });
    return;
  }

  if (!working.description.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required.',
      life: 3000,
    });
    return;
  }

  const current = props.risk.remediations
    ? props.risk.remediations.map((item) => cloneDeep(item))
    : [];

  const base: Response =
    editingIndex.value !== null && current[editingIndex.value]
      ? current[editingIndex.value]
      : {
          uuid: crypto.randomUUID(),
          lifecycle: working.lifecycle,
          title: working.title,
          description: working.description,
        };

  base.title = working.title.trim();
  base.lifecycle = working.lifecycle.trim();
  base.description = working.description.trim();
  base.remarks = working.remarks?.trim() || undefined;

  if (editingIndex.value === null) {
    current.push(base);
  } else {
    current.splice(editingIndex.value, 1, base);
  }

  emit('save', current);
  showEditor.value = false;
  resetWorking();
}

function removeRemediation(index: number) {
  if (!props.risk?.remediations) return;
  const next = props.risk.remediations.map((item) => cloneDeep(item));
  next.splice(index, 1);
  emit('save', next);
}
</script>
