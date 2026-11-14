<script setup lang="ts">
/**
 * The subject template form (create, edit or duplicate): name, type and source mode, display
 * priority and component type, the four text templates, the label schema and the identity keys
 * chosen from it, the selector labels, a preview, and optional properties and links. It saves the
 * template itself and emits `saved`.
 */
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import {
  buildUpsertSubjectTemplatePayload,
  DEFINED_COMPONENT_TYPE_OPTIONS,
  SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS,
  SUBJECT_TEMPLATE_TYPE_OPTIONS,
  type SubjectTemplateFormData,
  type SubjectTemplateSourceMode,
  type SubjectTemplateType,
} from '@/types/subject-templates';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import SubjectTemplatePreview from './SubjectTemplatePreview.vue';

const props = defineProps<{
  initial: SubjectTemplateFormData;
  /** Set when editing; without it the form creates a template. */
  templateId?: string;
}>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const formData = ref<SubjectTemplateFormData>(
  JSON.parse(JSON.stringify(props.initial)),
);

// The native controls hold strings; the form data keeps its own types.
const type = computed({
  get: () => formData.value.type,
  set: (value: string) => (formData.value.type = value as SubjectTemplateType),
});
const sourceMode = computed({
  get: () => formData.value.sourceMode,
  set: (value: string) =>
    (formData.value.sourceMode = value as SubjectTemplateSourceMode),
});
const displayPriority = computed({
  get: () => String(formData.value.displayPriority ?? ''),
  set: (value: string) => (formData.value.displayPriority = value),
});
/** '' is the API default (a service). */
const componentType = computed({
  get: () => formData.value.componentType ?? '',
  set: (value: string) => (formData.value.componentType = value || null),
});

const identityKeyOptions = computed(() =>
  formData.value.labelSchema
    .map((field) => field.key.trim())
    .filter((key, index, list) => key && list.indexOf(key) === index)
    .map((key) => ({ value: key, label: key })),
);

const nameError = ref('');
const saveError = ref('');
const saving = ref(false);

async function submit() {
  nameError.value = '';
  saveError.value = '';
  if (!formData.value.name.trim()) {
    nameError.value = 'Enter a name.';
    return;
  }
  let payload;
  try {
    payload = buildUpsertSubjectTemplatePayload(formData.value);
  } catch (error) {
    saveError.value = (error as Error).message;
    return;
  }
  saving.value = true;
  try {
    const config = { transformRequest: [decamelizeKeys] };
    if (props.templateId) {
      await api.put(
        `/api/admin/subject-templates/${props.templateId}`,
        payload,
        config,
      );
    } else {
      await api.post('/api/admin/subject-templates', payload, config);
    }
    toast.add({
      severity: 'success',
      summary: props.templateId ? 'Template saved' : 'Template created',
      detail: `${payload.name} was saved.`,
      life: 3000,
    });
    emit('saved');
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
      <FormField label="Name" required :error="nameError || undefined">
        <TextInput v-model="formData.name" />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="Type" required>
          <Select v-model="type" :options="SUBJECT_TEMPLATE_TYPE_OPTIONS" />
        </FormField>
        <FormField label="Source mode" required>
          <Select
            v-model="sourceMode"
            :options="SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS"
          />
        </FormField>
        <FormField label="Display priority" hint="A whole number.">
          <TextInput v-model="displayPriority" type="number" />
        </FormField>
        <FormField label="Component type">
          <Select
            v-model="componentType"
            :options="DEFINED_COMPONENT_TYPE_OPTIONS"
            placeholder="Service (the default)"
          />
        </FormField>
      </Grid>
      <Grid min="md" gap="4">
        <FormField label="Title template" hint="e.g. {{ repository }}">
          <Textarea v-model="formData.titleTemplate" :rows="2" />
        </FormField>
        <FormField
          label="Description template"
          hint="Use {{ label_key }} for label values."
        >
          <Textarea v-model="formData.descriptionTemplate" :rows="2" />
        </FormField>
        <FormField label="Purpose template">
          <Textarea v-model="formData.purposeTemplate" :rows="2" />
        </FormField>
        <FormField label="Remarks template">
          <Textarea v-model="formData.remarksTemplate" :rows="2" />
        </FormField>
      </Grid>
      <FieldList
        v-model="formData.labelSchema"
        legend="Label schema"
        hint="The evidence labels this template expects."
        item-label="field"
        add-label="Add field"
        empty-text="No schema fields yet."
        :new-item="() => ({ key: '', description: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Key" hint="e.g. repository"
              ><TextInput v-model="item.key"
            /></FormField>
            <FormField label="Description"
              ><TextInput v-model="item.description"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <CheckboxGroup
        v-if="identityKeyOptions.length"
        v-model="formData.identityLabelKeys"
        legend="Identity label keys"
        hint="The schema keys that identify one subject."
        :options="identityKeyOptions"
        required
      />
      <Text v-else variant="caption"
        >Add schema fields to choose the identity label keys.</Text
      >
      <FieldList
        v-model="formData.selectorLabels"
        legend="Selector labels"
        hint="Labels evidence must have for this template to apply."
        item-label="label"
        add-label="Add label"
        empty-text="No selector labels yet."
        :new-item="() => ({ key: '', value: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Key"><TextInput v-model="item.key" /></FormField>
            <FormField label="Value"
              ><TextInput v-model="item.value"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <SubjectTemplatePreview
        :title-template="formData.titleTemplate"
        :description-template="formData.descriptionTemplate"
        :purpose-template="formData.purposeTemplate"
        :remarks-template="formData.remarksTemplate"
        :label-schema="formData.labelSchema"
        :disabled="saving"
      />
      <Disclosure label="Properties and links">
        <Stack gap="4">
          <FieldList
            v-model="formData.props"
            legend="Properties"
            item-label="property"
            add-label="Add property"
            empty-text="No properties."
            :new-item="
              () => ({
                uuid: '',
                name: '',
                value: '',
                class: '',
                ns: '',
                remarks: '',
              })
            "
          >
            <template #item="{ item }">
              <Grid min="sm" gap="2">
                <FormField label="Name"
                  ><TextInput v-model="item.name"
                /></FormField>
                <FormField label="Value"
                  ><TextInput v-model="item.value"
                /></FormField>
                <FormField label="Class"
                  ><TextInput v-model="item.class"
                /></FormField>
                <FormField label="Namespace"
                  ><TextInput v-model="item.ns"
                /></FormField>
                <FormField label="Remarks"
                  ><TextInput v-model="item.remarks"
                /></FormField>
              </Grid>
            </template>
          </FieldList>
          <FieldList
            v-model="formData.links"
            legend="Links"
            item-label="link"
            add-label="Add link"
            empty-text="No links."
            :new-item="() => ({ href: '', rel: '', text: '' })"
          >
            <template #item="{ item }">
              <Grid min="sm" gap="2">
                <FormField label="URL"
                  ><TextInput v-model="item.href" type="url"
                /></FormField>
                <FormField label="Relation"
                  ><TextInput v-model="item.rel"
                /></FormField>
                <FormField label="Text"
                  ><TextInput v-model="item.text"
                /></FormField>
              </Grid>
            </template>
          </FieldList>
        </Stack>
      </Disclosure>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          templateId ? 'Save template' : 'Create template'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
