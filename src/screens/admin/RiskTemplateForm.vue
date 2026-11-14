<script setup lang="ts">
/**
 * A risk template's form (create, or edit a saved one): the plugin and policy package it answers,
 * its name, title and statement, likelihood and impact hints, violation and threat IDs, an
 * optional remediation with tasks, and whether it is active. Emits `saved`.
 */
import { reactive, ref } from 'vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import {
  getRiskTemplateApiId,
  type RiskTemplate,
} from '@/types/risk-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  emptyRiskTemplateForm,
  riskTemplateFormFrom,
  riskTemplateRequest,
} from './riskTemplateRequest';

const props = defineProps<{ template?: RiskTemplate }>();
const emit = defineEmits<{ saved: [template: RiskTemplate]; cancel: [] }>();

const api = useAuthenticatedInstance();
const form = reactive(
  props.template
    ? riskTemplateFormFrom(props.template)
    : emptyRiskTemplateForm(),
);

const REQUIRED = [
  ['pluginId', 'Enter the plugin ID.'],
  ['policyPackage', 'Enter the policy package.'],
  ['name', 'Enter a name.'],
  ['title', 'Enter a title.'],
  ['statement', 'Enter the risk statement.'],
] as const;
type Required = (typeof REQUIRED)[number][0];
const errors = reactive<Record<Required, string>>({
  pluginId: '',
  policyPackage: '',
  name: '',
  title: '',
  statement: '',
});
const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const saveError = ref('');
const saving = ref(false);

async function save() {
  for (const [key, message] of REQUIRED)
    errors[key] = form[key].trim() ? '' : message;
  saveError.value = '';
  if (REQUIRED.some(([key]) => errors[key])) return;
  let body;
  try {
    body = riskTemplateRequest(form);
  } catch (error) {
    saveError.value = (error as Error).message;
    return;
  }
  saving.value = true;
  try {
    const config = { transformRequest: [decamelizeKeys] };
    const id = props.template && getRiskTemplateApiId(props.template);
    const response = id
      ? await api.put<{ data: RiskTemplate }>(
          `/api/admin/risk-templates/${id}`,
          body,
          config,
        )
      : await api.post<{ data: RiskTemplate }>(
          '/api/admin/risk-templates',
          body,
          config,
        );
    emit('saved', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Stack gap="5">
      <Grid min="sm" gap="4">
        <FormField
          label="Plugin ID"
          required
          hint="e.g. aws-security-hub"
          :error="errors.pluginId || undefined"
        >
          <TextInput v-model="form.pluginId" />
        </FormField>
        <FormField
          label="Policy package"
          required
          hint="e.g. cis-aws-foundations"
          :error="errors.policyPackage || undefined"
        >
          <TextInput v-model="form.policyPackage" />
        </FormField>
        <FormField
          label="Name"
          required
          hint="Machine-friendly"
          :error="errors.name || undefined"
        >
          <TextInput v-model="form.name" />
        </FormField>
        <FormField
          label="Title"
          required
          hint="Human-friendly"
          :error="errors.title || undefined"
        >
          <TextInput v-model="form.title" />
        </FormField>
      </Grid>
      <FormField
        label="Statement"
        required
        :error="errors.statement || undefined"
      >
        <Textarea v-model="form.statement" :rows="4" />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="Likelihood hint"
          ><TextInput v-model="form.likelihoodHint"
        /></FormField>
        <FormField label="Impact hint"
          ><TextInput v-model="form.impactHint"
        /></FormField>
        <FormField label="State">
          <Select
            v-model="form.isActive"
            :options="ACTIVE_OPTIONS"
            placeholder="Not set"
          />
        </FormField>
      </Grid>
      <FieldList
        v-model="form.violationIds"
        legend="Violation IDs"
        item-label="violation ID"
        add-label="Add violation ID"
        empty-text="No violation IDs."
        :new-item="() => ({ id: '' })"
      >
        <template #item="{ item }">
          <FormField label="ID" hint="e.g. SV-1234"
            ><TextInput v-model="item.id"
          /></FormField>
        </template>
      </FieldList>
      <FieldList
        v-model="form.threatIds"
        legend="Threat IDs"
        item-label="threat ID"
        add-label="Add threat ID"
        empty-text="No threat IDs."
        :new-item="() => ({ system: '', id: '', title: '', url: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="System"
              ><TextInput v-model="item.system"
            /></FormField>
            <FormField label="ID"><TextInput v-model="item.id" /></FormField>
            <FormField label="Title"
              ><TextInput v-model="item.title"
            /></FormField>
            <FormField label="URL" hint="Optional"
              ><TextInput v-model="item.url" type="url"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <Checkbox
        v-model="form.enableRemediation"
        label="Include a remediation"
        description="A remediation plan, with tasks, for risks raised from this template."
      />
      <Stack v-if="form.enableRemediation" gap="4">
        <FormField label="Remediation title" required>
          <TextInput v-model="form.remediationTitle" />
        </FormField>
        <FormField label="Remediation description">
          <Textarea v-model="form.remediationDescription" :rows="2" />
        </FormField>
        <FieldList
          v-model="form.remediationTasks"
          legend="Remediation tasks"
          hint="In the order they are done."
          item-label="task"
          add-label="Add task"
          empty-text="No tasks."
          :new-item="() => ({ title: '' })"
        >
          <template #item="{ item }">
            <FormField label="Title"
              ><TextInput v-model="item.title"
            /></FormField>
          </template>
        </FieldList>
      </Stack>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          template ? 'Save template' : 'Create template'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
