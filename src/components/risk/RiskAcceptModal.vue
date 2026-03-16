<template>
  <Dialog v-model:visible="localVisible" modal size="lg" header="Accept Risk">
    <form class="space-y-4" @submit.prevent="submit">
      <p class="text-sm text-gray-600 dark:text-slate-400">
        Record the acceptance justification and next review deadline.
      </p>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Justification <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="justification"
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          placeholder="Explain why this risk is being accepted"
          :disabled="submitting"
          required
        ></textarea>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Review Deadline <span class="text-red-500">*</span>
        </label>
        <input
          v-model="reviewDeadline"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          :disabled="submitting"
          required
        />
      </div>

      <div class="flex items-center gap-2">
        <input
          id="accept-owner-update-toggle"
          v-model="includeOwnerUpdate"
          type="checkbox"
          :disabled="submitting"
        />
        <label
          for="accept-owner-update-toggle"
          class="text-sm text-gray-700 dark:text-slate-300"
        >
          Update owner assignments as part of acceptance
        </label>
      </div>

      <RiskOwnerAssignment
        v-if="includeOwnerUpdate"
        :initial-value="ownerDraft"
        :reset-key="ownerResetKey"
        mode="embedded"
        :disabled="submitting"
        @change="onOwnerDraftChange"
      />

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
          {{ submitting ? 'Accepting...' : 'Accept Risk' }}
        </button>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import RiskOwnerAssignment from '@/components/risk/RiskOwnerAssignment.vue';
import {
  normalizeOwnerAssignments,
  ownerAssignmentsSignature,
  type RiskOwnerAssignmentsPayload,
} from '@/utils/risk-workflow';

interface RiskAcceptSubmitPayload {
  justification: string;
  reviewDeadline: string;
  ownerUpdate?: RiskOwnerAssignmentsPayload;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    submitting?: boolean;
    initialOwnerAssignments: RiskOwnerAssignmentsPayload;
  }>(),
  {
    submitting: false,
  },
);

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  submit: [payload: RiskAcceptSubmitPayload];
}>();

const justification = ref('');
const reviewDeadline = ref('');
const includeOwnerUpdate = ref(false);
const ownerDraft = ref<RiskOwnerAssignmentsPayload>({ ownerAssignments: [] });
const ownerSnapshotSignature = ref('');
const ownerResetKey = ref(0);
const validationError = ref('');

const localVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const ownerDraftSignature = computed(() =>
  ownerAssignmentsSignature(ownerDraft.value),
);

const ownerDirty = computed(
  () => ownerDraftSignature.value !== ownerSnapshotSignature.value,
);

function toDateTimeLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultReviewDeadline(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toDateTimeLocal(date);
}

function resetForm() {
  justification.value = '';
  reviewDeadline.value = defaultReviewDeadline();
  includeOwnerUpdate.value = false;
  ownerDraft.value = normalizeOwnerAssignments(props.initialOwnerAssignments);
  ownerSnapshotSignature.value = ownerDraftSignature.value;
  ownerResetKey.value += 1;
  validationError.value = '';
}

function onOwnerDraftChange(payload: RiskOwnerAssignmentsPayload) {
  ownerDraft.value = normalizeOwnerAssignments(payload);
}

function submit() {
  validationError.value = '';
  const trimmedJustification = justification.value.trim();
  if (!trimmedJustification) {
    validationError.value = 'Justification is required.';
    return;
  }

  if (!reviewDeadline.value) {
    validationError.value = 'Review deadline is required.';
    return;
  }

  const parsedReviewDeadline = new Date(reviewDeadline.value);
  if (Number.isNaN(parsedReviewDeadline.getTime())) {
    validationError.value = 'Review deadline is invalid.';
    return;
  }

  if (parsedReviewDeadline.getTime() <= Date.now()) {
    validationError.value = 'Review deadline must be in the future.';
    return;
  }

  emit('submit', {
    justification: trimmedJustification,
    reviewDeadline: parsedReviewDeadline.toISOString(),
    ownerUpdate:
      includeOwnerUpdate.value && ownerDirty.value
        ? ownerDraft.value
        : undefined,
  });
}

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
