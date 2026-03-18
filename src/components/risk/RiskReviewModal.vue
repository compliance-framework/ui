<template>
  <Dialog v-model:visible="localVisible" modal size="lg" header="Review Risk">
    <form class="space-y-4" @submit.prevent="submit">
      <p class="text-sm text-gray-600 dark:text-slate-400">
        Review the accepted risk and either extend its review horizon or reopen
        it for investigation.
      </p>

      <div
        class="bg-slate-50 dark:bg-slate-800/60 border border-ccf-300 dark:border-slate-700 rounded-md p-3 space-y-2"
      >
        <p
          class="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide"
        >
          Current Acceptance
        </p>
        <p class="text-sm text-gray-800 dark:text-slate-200">
          <span class="font-semibold">Justification:</span>
          <span class="ml-1">{{ acceptanceJustification || 'N/A' }}</span>
        </p>
        <p class="text-sm text-gray-800 dark:text-slate-200">
          <span class="font-semibold">Review Deadline:</span>
          <span class="ml-1">{{ formattedCurrentDeadline }}</span>
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Decision <span class="text-red-500">*</span>
        </label>
        <select
          v-model="decision"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          :disabled="submitting"
        >
          <option value="extend">Extend</option>
          <option value="reopen">Reopen</option>
        </select>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Next Review Deadline
          <span v-if="decision === 'extend'" class="text-red-500">*</span>
        </label>
        <input
          v-model="nextReviewDeadline"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          :disabled="submitting || decision === 'reopen'"
          :required="decision === 'extend'"
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Notes
        </label>
        <textarea
          v-model="notes"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          placeholder="Optional review notes"
          :disabled="submitting"
        ></textarea>
      </div>

      <Message v-if="validationError" severity="error" variant="outlined">
        {{ validationError }}
      </Message>

      <div class="flex justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
          :disabled="submitting"
          @click="localVisible = false"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          :disabled="submitting"
        >
          {{ submitting ? 'Submitting...' : 'Submit Review' }}
        </button>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import type { RiskReviewDecision } from '@/utils/risk-workflow';

interface RiskReviewSubmitPayload {
  decision: Extract<RiskReviewDecision, 'extend' | 'reopen'>;
  notes?: string;
  nextReviewDeadline?: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    submitting?: boolean;
    acceptanceJustification?: string;
    reviewDeadline?: string;
  }>(),
  {
    submitting: false,
    acceptanceJustification: '',
    reviewDeadline: '',
  },
);

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  submit: [payload: RiskReviewSubmitPayload];
}>();

const decision =
  ref<Extract<RiskReviewDecision, 'extend' | 'reopen'>>('extend');
const nextReviewDeadline = ref('');
const notes = ref('');
const validationError = ref('');

const localVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const formattedCurrentDeadline = computed(() => {
  if (!props.reviewDeadline) return 'N/A';
  const parsed = new Date(props.reviewDeadline);
  if (Number.isNaN(parsed.getTime())) return props.reviewDeadline;
  return parsed.toLocaleString();
});

function toDateTimeLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultNextDeadline(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return toDateTimeLocal(date);
}

function resetForm() {
  decision.value = 'extend';
  nextReviewDeadline.value = defaultNextDeadline();
  notes.value = '';
  validationError.value = '';
}

function submit() {
  validationError.value = '';

  let nextDeadlineIso: string | undefined;

  if (decision.value === 'extend') {
    if (!nextReviewDeadline.value) {
      validationError.value =
        'Next review deadline is required when decision is extend.';
      return;
    }
    const parsed = new Date(nextReviewDeadline.value);
    if (Number.isNaN(parsed.getTime())) {
      validationError.value = 'Next review deadline is invalid.';
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      validationError.value = 'Next review deadline must be in the future.';
      return;
    }
    nextDeadlineIso = parsed.toISOString();
  }

  if (decision.value === 'reopen' && nextReviewDeadline.value) {
    validationError.value =
      'Next review deadline must be empty when decision is reopen.';
    return;
  }

  const trimmedNotes = notes.value.trim();

  emit('submit', {
    decision: decision.value,
    notes: trimmedNotes ? trimmedNotes : undefined,
    nextReviewDeadline: nextDeadlineIso,
  });
}

watch(
  () => decision.value,
  (value) => {
    if (value === 'reopen') {
      nextReviewDeadline.value = '';
      return;
    }
    if (!nextReviewDeadline.value) {
      nextReviewDeadline.value = defaultNextDeadline();
    }
  },
);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>
