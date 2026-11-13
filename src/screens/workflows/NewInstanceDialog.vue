<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import type { WorkflowDefinition, WorkflowInstance } from '@/types/workflows';
import type { DataResponse } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import {
  CADENCE_OPTIONS,
  applyDefinition,
  instancePayload,
  newDraft,
  validateDraft,
} from './workflowInstances';

/**
 * New workflow instance for a system: a definition, a name, how often it runs, and the grace
 * period before its tasks are overdue. Choosing a definition fills in its suggestions.
 */
const props = defineProps<{
  systemId: string;
  definitions: WorkflowDefinition[];
  /** Pre-selects a definition, e.g. the one the list is filtered to. */
  definitionId?: string;
}>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ created: [instance: WorkflowInstance] }>();

const api = useAuthenticatedInstance();
const draft = ref(newDraft());
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

watch(open, (isOpen) => {
  if (!isOpen) return;
  draft.value = applyDefinition(
    newDraft(props.definitionId),
    props.definitions.find((d) => d.id === props.definitionId),
  );
  attempted.value = false;
  saveError.value = undefined;
});

function chooseDefinition(id: string): void {
  draft.value = applyDefinition(
    { ...draft.value, definitionId: id },
    props.definitions.find((d) => d.id === id),
  );
}

const errors = computed(() =>
  attempted.value ? validateDraft(draft.value) : {},
);
const definitionOptions = computed(() => [
  { value: '', label: 'Choose a definition' },
  ...props.definitions.map((d) => ({ value: d.id, label: d.name })),
]);
const dirty = computed(() =>
  Boolean(
    draft.value.definitionId || draft.value.name || draft.value.description,
  ),
);

async function submit(): Promise<void> {
  attempted.value = true;
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const response = await api.post<DataResponse<WorkflowInstance>>(
      '/api/workflows/instances',
      instancePayload(draft.value, props.systemId),
      { transformRequest: [decamelizeKeys] },
    );
    open.value = false;
    emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      "The instance couldn't be created. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="New workflow instance"
    description="Run a workflow definition for this system on a schedule."
    :dirty="dirty"
  >
    <template #default="{ requestClose }">
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <FormField
            label="Workflow definition"
            required
            :error="errors.definition"
          >
            <Select
              :model-value="draft.definitionId"
              :options="definitionOptions"
              @update:model-value="chooseDefinition"
            />
          </FormField>
          <FormField label="Name" required :error="errors.name">
            <TextInput v-model="draft.name" />
          </FormField>
          <FormField label="Description">
            <Textarea
              v-model="draft.description"
              :rows="3"
              placeholder="What this instance is for"
            />
          </FormField>
          <FormField label="How often it runs" required>
            <Select v-model="draft.cadence" :options="CADENCE_OPTIONS" />
          </FormField>
          <FormField
            v-if="draft.cadence === 'custom'"
            label="Cron expression (6 fields)"
            hint="Seconds, minutes, hours, day of month, month, day of week."
            required
            :error="errors.cron"
          >
            <TextInput v-model="draft.cron" placeholder="0 0 9 * * 1" />
          </FormField>
          <FormField
            label="Grace period (days)"
            hint="How long tasks may run past their due date before they count as overdue."
            :error="errors.gracePeriod"
          >
            <TextInput v-model="draft.gracePeriod" />
          </FormField>
          <InlineMessage v-if="saveError" tone="error" title="Not created">
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving"
              >Create instance</Button
            >
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
