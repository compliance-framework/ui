<template>
  <Dialog
    v-model:visible="localVisible"
    modal
    size="lg"
    header="Promote Risk to POAM Item"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Status transition banner -->
      <div
        class="flex items-center gap-2 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-800"
      >
        <span class="font-medium">Status transition:</span>
        <span
          class="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium"
          >Investigating</span
        >
        <span class="text-indigo-500">→</span>
        <span
          class="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium"
          >Mitigating Planned</span
        >
      </div>

      <!-- Title -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          POAM Item Title
        </label>
        <input
          v-model="form.title"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200 text-sm"
          :placeholder="riskTitle || 'Defaults to risk title'"
          :disabled="submitting"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Leave blank to inherit the risk title.
        </p>
      </div>

      <!-- Planned Completion Date -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Planned Completion Date
        </label>
        <input
          v-model="form.deadline"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200 text-sm"
          :disabled="submitting"
        />
      </div>

      <!-- Resource Required -->
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Resource Required
          <span class="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          v-model="form.resourceRequired"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200 text-sm"
          placeholder="e.g. 3 engineer days, £5k budget"
          :disabled="submitting"
        />
      </div>

      <!-- Milestones preview (template-derived) -->
      <div v-if="templateMilestoneTitles.length > 0">
        <p class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Milestones from Remediation Template
        </p>
        <ul class="space-y-1">
          <li
            v-for="(title, idx) in templateMilestoneTitles"
            :key="idx"
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400"
          >
            <span
              class="inline-block w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 text-xs text-center leading-5 text-gray-600 dark:text-slate-300 shrink-0"
              >{{ idx + 1 }}</span
            >
            {{ title }}
          </li>
        </ul>
      </div>
      <div v-else>
        <p class="text-xs text-gray-400 dark:text-slate-500 italic">
          No remediation template found for this risk. Milestones can be added
          to the POAM item after promotion.
        </p>
      </div>

      <!-- Validation error -->
      <p v-if="validationError" class="text-sm text-red-600">
        {{ validationError }}
      </p>

      <!-- Footer buttons -->
      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          :disabled="submitting"
          @click="cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 rounded-md text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
          :disabled="submitting"
        >
          <span v-if="submitting">Promoting…</span>
          <span v-else>Promote to POAM</span>
        </button>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Controls modal visibility via v-model:visible */
  visible: boolean;
  /** Whether the parent is currently submitting the promotion request */
  submitting: boolean;
  /** Risk title — used as placeholder for the POAM item title field */
  riskTitle?: string;
  /** Milestone titles derived from the risk's remediation template (read-only preview) */
  templateMilestoneTitles?: string[];
}>();

// ─── Emits ────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Emitted when the user confirms the promotion */
  (
    event: 'submit',
    payload: {
      title?: string;
      deadline?: string;
      resourceRequired?: string;
    },
  ): void;
  /** Emitted when the user cancels */
  (event: 'update:visible', value: boolean): void;
}>();

// ─── Local state ──────────────────────────────────────────────────────────────

const localVisible = ref(props.visible);

const form = ref({
  title: '',
  deadline: '',
  resourceRequired: '',
});

const validationError = ref('');

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(
  () => props.visible,
  (value) => {
    localVisible.value = value;
    if (value) resetForm();
  },
);

watch(localVisible, (value) => {
  emit('update:visible', value);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetForm() {
  form.value = { title: '', deadline: '', resourceRequired: '' };
  validationError.value = '';
}

function cancel() {
  localVisible.value = false;
}

function submit() {
  validationError.value = '';

  const payload: {
    title?: string;
    deadline?: string;
    resourceRequired?: string;
  } = {};

  const trimmedTitle = form.value.title.trim();
  if (trimmedTitle) payload.title = trimmedTitle;

  if (form.value.deadline) {
    // Convert YYYY-MM-DD date input to ISO 8601 datetime string (end of day UTC).
    const parsed = new Date(`${form.value.deadline}T23:59:59Z`);
    if (Number.isNaN(parsed.getTime())) {
      validationError.value = 'Planned completion date is invalid.';
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      validationError.value = 'Planned completion date must be in the future.';
      return;
    }
    payload.deadline = parsed.toISOString();
  }

  const trimmedResource = form.value.resourceRequired.trim();
  if (trimmedResource) payload.resourceRequired = trimmedResource;

  emit('submit', payload);
}
</script>
