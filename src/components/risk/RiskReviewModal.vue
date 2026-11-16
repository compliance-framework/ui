<template>
  <Dialog v-model:open="localVisible" title="Review risk" size="l">
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <Text
          >Extend the accepted risk's review deadline, or reopen it for
          investigation.</Text
        >
        <DescriptionList
          :items="[
            {
              key: 'justification',
              label: 'Acceptance justification',
              value: acceptanceJustification || '',
            },
            {
              key: 'deadline',
              label: 'Current review deadline',
              value: formattedCurrentDeadline,
            },
          ]"
        />
        <FormField label="Decision" required>
          <Select
            v-model="decision"
            :options="[
              { value: 'extend', label: 'Extend' },
              { value: 'reopen', label: 'Reopen' },
            ]"
          />
        </FormField>
        <FormField
          v-if="decision === 'extend'"
          label="Next review deadline"
          required
        >
          <TextInput v-model="nextReviewDeadline" type="datetime-local" />
        </FormField>
        <FormField label="Notes" hint="Optional">
          <Textarea v-model="notes" :rows="3" />
        </FormField>
        <InlineMessage v-if="validationError" tone="error" title="Not submitted"
          ><p>{{ validationError }}</p></InlineMessage
        >
        <Cluster justify="end" gap="2">
          <Button @click="localVisible = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="submitting"
            >Submit review</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
/** Reviewing an accepted risk: extend its review deadline or reopen it, with notes. Emits `submit`; the risk page saves it. The script is the classic dialog's. */
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { computed, ref, watch } from 'vue';
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
