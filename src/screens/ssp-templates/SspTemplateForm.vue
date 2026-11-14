<script setup lang="ts">
/**
 * The system template form (create, or edit a saved template): name and enabled, the key labels
 * (fixed once created), an evidence filter, scope label groups, minimum streams, the profiles to
 * attach, the title and description templates with a preview, and properties. It saves through
 * the admin API and emits `saved` with the API's copy of the template.
 */
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import type { Profile } from '@/oscal';
import { getErrorDetail } from '@/utils/httpErrors';
import {
  buildUpsertSspTemplatePayload,
  createEmptySspTemplateForm,
  createSspTemplateFormFromTemplate,
  parseSspTemplateFilter,
  type SspTemplate,
} from '@/types/ssp-templates';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import SubjectTemplatePreview from '@/screens/admin/SubjectTemplatePreview.vue';

const props = defineProps<{ template?: SspTemplate | null }>();
const emit = defineEmits<{
  saved: [template: SspTemplate | undefined];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const isEdit = computed(() => Boolean(props.template?.id));

const form = ref(
  props.template
    ? createSspTemplateFormFromTemplate(props.template)
    : createEmptySspTemplateForm(),
);

// Label lists are typed as comma-separated text and split on save.
const splitLabels = (text: string) =>
  text
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
const keysText = ref(form.value.keys.join(', '));
const scopeGroups = ref(
  form.value.scopeLabels.map((group) => ({ labels: group.join(', ') })),
);
const minStreams = computed({
  get: () => String(form.value.minStreams ?? ''),
  set: (value: string) => (form.value.minStreams = value),
});

const profiles = useApiQuery<Profile[]>('/api/oscal/profiles', {
  isEmpty: (list) => list.length === 0,
});
const profileOptions = computed(() =>
  (profiles.data.value ?? []).map((profile) => ({
    value: profile.uuid,
    label: profile.metadata?.title ?? profile.uuid,
  })),
);

const filterError = computed(() => {
  try {
    parseSspTemplateFilter(form.value.filter);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
});

// The preview substitutes `{{ name }}` by the sample label named `name`. System templates are
// Go templates over the key values (`{{ ._app }}`), so each sample label gets the leading dot.
const previewLabelSchema = computed(() =>
  splitLabels(keysText.value).map((key) => ({
    key: `.${key}`,
    description: '',
  })),
);

const saveError = ref('');
const saving = ref(false);

async function submit() {
  saveError.value = '';
  form.value.keys = splitLabels(keysText.value);
  form.value.scopeLabels = scopeGroups.value
    .map((group) => splitLabels(group.labels))
    .filter((group) => group.length);
  let payload;
  try {
    payload = buildUpsertSspTemplatePayload(form.value);
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : String(error);
    return;
  }
  const id = props.template?.id;
  saving.value = true;
  try {
    const config = { transformRequest: [decamelizeKeys] };
    const response = id
      ? await api.put<{ data: SspTemplate }>(
          `/api/admin/ssp-templates/${id}`,
          payload,
          config,
        )
      : await api.post<{ data: SspTemplate }>(
          '/api/admin/ssp-templates',
          payload,
          config,
        );
    toast.add({
      severity: 'success',
      summary: id ? 'Template saved' : 'Template created',
      detail: `${payload.name} was saved.`,
      life: 3000,
    });
    emit('saved', response.data?.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="5">
      <FormField label="Name" required>
        <TextInput
          v-model="form.name"
          placeholder="e.g. Applications by _app"
        />
      </FormField>
      <Checkbox
        v-model="form.enabled"
        label="Enabled"
        description="Discovery runs only for enabled templates."
      />
      <FormField
        label="Key labels"
        required
        :readonly="isEdit"
        :hint="
          isEdit
            ? undefined
            : 'Comma-separated. One system is created for every distinct combination of these label values. Keys cannot change after creation.'
        "
      >
        <TextInput v-model="keysText" placeholder="e.g. _app, env" />
      </FormField>
      <FormField
        label="Evidence filter"
        :error="filterError"
        hint="Optional. Only matching evidence counts, e.g. env=prod AND team!=sandbox."
      >
        <TextInput v-model="form.filter" placeholder="auto_create_ssp=true" />
      </FormField>
      <FieldList
        v-model="scopeGroups"
        legend="Scope label groups"
        hint="Values learned into each system's scope. The labels of one group are learned together as one entry."
        item-label="group"
        add-label="Add group"
        empty-text="No scope label groups."
        :new-item="() => ({ labels: '' })"
      >
        <template #item="{ item }">
          <FormField label="Labels" hint="Comma-separated">
            <TextInput v-model="item.labels" />
          </FormField>
        </template>
      </FieldList>
      <FormField label="Minimum streams" hint="A whole number, at least 1.">
        <TextInput v-model="minStreams" type="number" />
      </FormField>
      <DataState
        :status="profiles.status.value"
        subject="the profiles"
        empty-title="No profiles"
        empty-body="Created systems won't have profiles attached."
        skeleton="text"
        @retry="profiles.retry"
      >
        <CheckboxGroup
          v-model="form.profileIds"
          legend="Profiles"
          hint="Attached to each created system."
          :options="profileOptions"
        />
      </DataState>
      <Grid min="md" gap="4">
        <FormField
          label="Title template"
          required
          hint="e.g. SSP for Application {{ ._app }}"
        >
          <Textarea v-model="form.titleTemplate" :rows="2" />
        </FormField>
        <FormField
          label="Description template"
          hint="e.g. Created from evidence labelled _app={{ ._app }}"
        >
          <Textarea v-model="form.descriptionTemplate" :rows="2" />
        </FormField>
      </Grid>
      <SubjectTemplatePreview
        :title-template="form.titleTemplate"
        :description-template="form.descriptionTemplate"
        purpose-template=""
        remarks-template=""
        :label-schema="previewLabelSchema"
        :disabled="saving"
      />
      <FieldList
        v-model="form.props"
        legend="Properties"
        item-label="property"
        add-label="Add property"
        empty-text="No properties."
        :new-item="() => ({ name: '', value: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Name"
              ><TextInput v-model="item.name"
            /></FormField>
            <FormField label="Value" hint="A template, e.g. {{ ._app }}"
              ><TextInput v-model="item.value"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          isEdit ? 'Save template' : 'Create template'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
