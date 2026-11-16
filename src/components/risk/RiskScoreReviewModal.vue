<template>
  <Dialog v-model:open="localVisible" title="Review risk score" size="l">
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <DescriptionList
          :items="[
            {
              key: 'likelihood',
              label: 'Current likelihood',
              value: formatTokenLabel(currentLikelihood),
            },
            {
              key: 'impact',
              label: 'Current impact',
              value: formatTokenLabel(currentImpact),
            },
          ]"
        />
        <FormField label="Likelihood" required>
          <Select
            v-model="likelihood"
            data-testid="score-review-likelihood"
            placeholder="Choose a likelihood"
            :options="[
              { value: 'low', label: 'Low' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]"
          />
        </FormField>
        <FormField label="Impact" required>
          <Select
            v-model="impact"
            data-testid="score-review-impact"
            placeholder="Choose an impact"
            :options="[
              { value: 'low', label: 'Low' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]"
          />
        </FormField>
        <FormField label="Notes" hint="Optional">
          <Textarea
            v-model="notes"
            data-testid="score-review-notes"
            :rows="3"
          />
        </FormField>
        <InlineMessage v-if="validationError" tone="error" title="Not submitted"
          ><p>{{ validationError }}</p></InlineMessage
        >
        <Cluster justify="end" gap="2">
          <Button @click="localVisible = false">Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            data-testid="score-review-modal-submit"
            :loading="submitting"
            >Review risk score</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
/** Reassessing an open or investigating risk: new likelihood and impact, with notes. Emits `submit`; the risk page saves it. The script is the classic dialog's. */
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { computed, ref, watch } from 'vue';

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
