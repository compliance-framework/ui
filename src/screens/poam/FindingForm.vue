<script setup lang="ts">
/**
 * Add or edit a POA&M finding: title, description, what it is about (an objective or statement
 * and whether it is satisfied, with an optional implementation status), the plan's observations
 * and risks behind it, and remarks. Emits `created` or `saved`.
 */
import { computed, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { Finding, Observation, Risk } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ poamId: string; finding?: Finding }>();
const emit = defineEmits<{
  created: [finding: Finding];
  saved: [finding: Finding];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const plan = `/api/oscal/plan-of-action-and-milestones/${props.poamId}`;

const TARGET_TYPES = [
  { value: 'objective-id', label: 'Control objective' },
  { value: 'statement-id', label: 'Control statement' },
];
const STATES = [
  { value: 'not-satisfied', label: 'Not satisfied' },
  { value: 'satisfied', label: 'Satisfied' },
];
const IMPLEMENTATION = [
  { value: 'none', label: 'Not stated' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'partial', label: 'Partial' },
  { value: 'planned', label: 'Planned' },
  { value: 'alternative', label: 'Alternative' },
  { value: 'not-applicable', label: 'Not applicable' },
];

const target = props.finding?.target;
const draft = reactive({
  title: props.finding?.title ?? '',
  description: props.finding?.description ?? '',
  targetType: target?.type || 'objective-id',
  targetId: target?.targetId ?? '',
  state: target?.status?.state || 'not-satisfied',
  implementation: target?.implementationStatus?.state || 'none',
  observations: (props.finding?.relatedObservations ?? []).map(
    (o) => o.observationUuid,
  ),
  risks: (props.finding?.relatedRisks ?? []).map((r) => r.riskUuid),
  remarks: props.finding?.remarks ?? '',
});

const observations = useApiQuery<Observation[]>(`${plan}/observations`);
const risks = useApiQuery<Risk[]>(`${plan}/risks`);
const observationOptions = computed(() =>
  (observations.data.value ?? []).map((o) => ({
    value: o.uuid,
    label: o.title || o.description || o.uuid,
  })),
);
const riskOptions = computed(() =>
  (risks.data.value ?? []).map((r) => ({
    value: r.uuid!,
    label: r.title || r.uuid!,
  })),
);

const errors = reactive({ title: '', description: '', targetId: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.description = draft.description.trim() ? '' : 'Enter a description.';
  errors.targetId = draft.targetId.trim()
    ? ''
    : 'Enter the objective or statement ID, e.g. ac-2_obj.';
  if (errors.title || errors.description || errors.targetId) return;
  saving.value = true;
  saveError.value = '';
  const body: Finding = {
    ...(props.finding ?? { uuid: uuid() }),
    title: draft.title.trim(),
    description: draft.description.trim(),
    target: {
      ...(target ?? {}),
      type: draft.targetType,
      targetId: draft.targetId.trim(),
      status: { ...(target?.status ?? {}), state: draft.state },
      implementationStatus:
        draft.implementation === 'none'
          ? undefined
          : {
              ...(target?.implementationStatus ?? {}),
              state: draft.implementation,
            },
    },
    relatedObservations: draft.observations.length
      ? draft.observations.map((observationUuid) => ({ observationUuid }))
      : undefined,
    relatedRisks: draft.risks.length
      ? draft.risks.map((riskUuid) => ({ riskUuid }))
      : undefined,
    remarks: draft.remarks.trim() || undefined,
  } as Finding;
  try {
    const response = props.finding
      ? await api.put<{ data: Finding }>(
          `${plan}/findings/${props.finding.uuid}`,
          body,
          {
            transformRequest: [decamelizeKeys],
          },
        )
      : await api.post<{ data: Finding }>(`${plan}/findings`, body, {
          transformRequest: [decamelizeKeys],
        });
    toast.add({
      severity: 'success',
      summary: props.finding ? 'Finding saved' : 'Finding added',
      life: 3000,
    });
    if (props.finding) emit('saved', response.data.data);
    else emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Stack gap="4">
      <FormField label="Title" required :error="errors.title">
        <TextInput v-model="draft.title" />
      </FormField>
      <FormField label="Description" required :error="errors.description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="About">
          <Select v-model="draft.targetType" :options="TARGET_TYPES" />
        </FormField>
        <FormField
          label="Objective or statement ID"
          required
          :error="errors.targetId"
        >
          <TextInput v-model="draft.targetId" />
        </FormField>
      </Grid>
      <Grid min="sm" gap="4">
        <FormField label="Result" required>
          <Select v-model="draft.state" :options="STATES" />
        </FormField>
        <FormField label="Implementation status">
          <Select v-model="draft.implementation" :options="IMPLEMENTATION" />
        </FormField>
      </Grid>
      <CheckboxGroup
        v-if="observationOptions.length"
        v-model="draft.observations"
        legend="Related observations"
        :options="observationOptions"
      />
      <CheckboxGroup
        v-if="riskOptions.length"
        v-model="draft.risks"
        legend="Related risks"
        :options="riskOptions"
      />
      <FormField label="Remarks"
        ><Textarea v-model="draft.remarks" :rows="2"
      /></FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          finding ? 'Save finding' : 'Add finding'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
