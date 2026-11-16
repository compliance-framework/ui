<template>
  <Dialog v-model:open="localVisible" title="Accept risk" size="l">
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <Text
          >Record why the risk is accepted and when it is next reviewed.</Text
        >
        <FormField label="Justification" required>
          <Textarea v-model="justification" :rows="4" />
        </FormField>
        <FormField label="Review deadline" required hint="In the future.">
          <TextInput v-model="reviewDeadline" type="datetime-local" />
        </FormField>
        <Checkbox
          v-model="includeOwnerUpdate"
          label="Change the owners as part of accepting"
        />
        <RiskOwnerAssignment
          v-if="includeOwnerUpdate"
          :initial-value="ownerDraft"
          :reset-key="ownerResetKey"
          mode="embedded"
          :disabled="submitting"
          @change="onOwnerDraftChange"
        />
        <InlineMessage v-if="validationError" tone="error" title="Not accepted"
          ><p>{{ validationError }}</p></InlineMessage
        >
        <Cluster justify="end" gap="2">
          <Button @click="localVisible = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="submitting"
            >Accept risk</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
/** Accepting a risk: a justification, the next review deadline and, optionally, new owners. Emits `submit`; the risk page saves it. The script is the classic dialog's. */
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { computed, ref, watch } from 'vue';
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
