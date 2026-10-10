<template>
  <Dialog
    v-model:visible="localVisible"
    modal
    size="lg"
    header="Review Risk Score"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <p class="text-sm text-gray-600 dark:text-slate-400">
        Reassess the risk likelihood and impact while the risk is open or
        investigating.
      </p>

      <div
        class="bg-slate-50 dark:bg-slate-800/60 border border-ccf-300 dark:border-slate-700 rounded-md p-3 space-y-2"
      >
        <p
          class="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide"
        >
          Current Score
        </p>
        <p class="text-sm text-gray-800 dark:text-slate-200">
          <span class="font-semibold">Likelihood:</span>
          <span class="ml-1">{{ formatTokenLabel(currentLikelihood) }}</span>
        </p>
        <p class="text-sm text-gray-800 dark:text-slate-200">
          <span class="font-semibold">Impact:</span>
          <span class="ml-1">{{ formatTokenLabel(currentImpact) }}</span>
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Likelihood <span class="text-red-500">*</span>
        </label>
        <select
          v-model="likelihood"
          data-testid="score-review-likelihood"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          :disabled="submitting"
        >
          <option value="">Select likelihood</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Impact <span class="text-red-500">*</span>
        </label>
        <select
          v-model="impact"
          data-testid="score-review-impact"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          :disabled="submitting"
        >
          <option value="">Select impact</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          Notes
        </label>
        <textarea
          v-model="notes"
          data-testid="score-review-notes"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          placeholder="Optional reassessment notes"
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
          data-testid="score-review-modal-submit"
          class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
          :disabled="submitting"
        >
          {{ submitting ? 'Submitting...' : 'Review Risk Score' }}
        </button>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';

type RiskScoreLevel = 'low' | 'moderate' | 'high' | 'critical';

interface RiskScoreReviewSubmitPayload {
  decision: 'reassess';
  likelihood: RiskScoreLevel;
  impact: RiskScoreLevel;
  notes?: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    submitting?: boolean;
    currentLikelihood?: string;
    currentImpact?: string;
  }>(),
  {
    submitting: false,
    currentLikelihood: '',
    currentImpact: '',
  },
);

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  submit: [payload: RiskScoreReviewSubmitPayload];
}>();

const likelihood = ref('');
const impact = ref('');
const notes = ref('');
const validationError = ref('');

const localVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

function normalizeScoreLevel(value?: string): RiskScoreLevel | '' {
  const normalized = (value || '').trim().toLowerCase();
  const canonical = normalized === 'medium' ? 'moderate' : normalized;
  if (
    canonical === 'low' ||
    canonical === 'moderate' ||
    canonical === 'high' ||
    canonical === 'critical'
  ) {
    return canonical;
  }
  return '';
}

function formatTokenLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return 'N/A';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function resetForm() {
  likelihood.value = normalizeScoreLevel(props.currentLikelihood);
  impact.value = normalizeScoreLevel(props.currentImpact);
  notes.value = '';
  validationError.value = '';
}

function submit() {
  validationError.value = '';

  const normalizedLikelihood = normalizeScoreLevel(likelihood.value);
  const normalizedImpact = normalizeScoreLevel(impact.value);
  if (!normalizedLikelihood || !normalizedImpact) {
    validationError.value = 'Likelihood and impact are required.';
    return;
  }

  const trimmedNotes = notes.value.trim();

  emit('submit', {
    decision: 'reassess',
    likelihood: normalizedLikelihood,
    impact: normalizedImpact,
    notes: trimmedNotes || undefined,
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
