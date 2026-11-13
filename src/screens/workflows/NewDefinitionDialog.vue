<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';
import type { EvidenceType, WorkflowDefinition } from '@/types/workflows';
import { getErrorDetail } from '@/utils/httpErrors';
import {
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  stringifyEvidenceRequired,
} from '@/utils/workflows';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import { CADENCE_OPTIONS } from './workflowInstances';

/**
 * New workflow definition: the template's name, version and suggestions for instances (cadence,
 * grace period, evidence). Steps are added on the definition's page, which opens once it's created.
 */
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ created: [definition: WorkflowDefinition] }>();

const EVIDENCE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'text', label: 'Text' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'automatic', label: 'Automatic evidence' },
];
const cadenceOptions = [
  { value: '', label: 'No suggestion' },
  ...CADENCE_OPTIONS.filter((o) => o.value !== 'custom'),
];

const api = useAuthenticatedInstance();
const blank = () => ({
  name: '',
  description: '',
  version: '1.0.0',
  cadence: '',
  gracePeriod: String(DEFAULT_GRACE_PERIOD_DAYS),
  evidence: [] as string[],
});
const draft = reactive(blank());
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(draft, blank());
  attempted.value = false;
  saveError.value = undefined;
});

const errors = computed<Record<string, string>>(() => {
  if (!attempted.value) return {};
  const found: Record<string, string> = {};
  if (!draft.name.trim()) found.name = 'Enter a name.';
  else if (draft.name.length > 255) found.name = 'Use 255 characters or fewer.';
  if (parseGracePeriodInput(draft.gracePeriod).error)
    found.gracePeriod = 'Enter a whole number of days, like 7.';
  return found;
});

async function submit(): Promise<void> {
  attempted.value = true;
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const response = await api.post<DataResponse<WorkflowDefinition>>(
      '/api/workflows/definitions',
      {
        name: draft.name.trim(),
        description: draft.description.trim(),
        version: draft.version.trim() || '1.0.0',
        suggestedCadence: draft.cadence || undefined,
        evidenceRequired: stringifyEvidenceRequired(
          draft.evidence as EvidenceType[],
        ),
        gracePeriodDays: parseGracePeriodInput(draft.gracePeriod).value,
      },
      { transformRequest: [decamelizeKeys] },
    );
    open.value = false;
    emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      "The definition couldn't be created. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="New workflow definition"
    description="A template for recurring compliance work. Add its steps once it's created."
    :dirty="Boolean(draft.name || draft.description)"
  >
    <template #default="{ requestClose }">
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <FormField label="Name" required :error="errors.name">
            <TextInput v-model="draft.name" />
          </FormField>
          <FormField label="Description">
            <Textarea v-model="draft.description" :rows="3" />
          </FormField>
          <FormField label="Version">
            <TextInput v-model="draft.version" />
          </FormField>
          <FormField
            label="Suggested cadence"
            hint="New instances start with this; each instance can change it."
          >
            <Select v-model="draft.cadence" :options="cadenceOptions" />
          </FormField>
          <FormField
            label="Grace period (days)"
            hint="How long tasks may run past their due date before they count as overdue."
            :error="errors.gracePeriod"
          >
            <TextInput v-model="draft.gracePeriod" />
          </FormField>
          <CheckboxGroup
            v-model="draft.evidence"
            legend="Evidence required"
            :options="EVIDENCE_OPTIONS"
          />
          <InlineMessage v-if="saveError" tone="error" title="Not created">
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving"
              >Create definition</Button
            >
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
