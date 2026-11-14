<script setup lang="ts">
/**
 * Add or edit a component in a component definition: type, title, description and purpose. The
 * API stores only these here (its props and links aren't saved), so the form offers only these.
 */
import { reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { v4 as uuidv4 } from 'uuid';
import type { DefinedComponent } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { DEFINED_COMPONENT_TYPE_OPTIONS } from '@/types/subject-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  componentDefinitionId: string;
  component?: DefinedComponent;
}>();
const emit = defineEmits<{
  created: [component: DefinedComponent];
  updated: [component: DefinedComponent];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/component-definitions/${props.componentDefinitionId}/components`;
const typeOptions = DEFINED_COMPONENT_TYPE_OPTIONS.map((o) => o.value).filter(
  (value): value is string => Boolean(value),
);

const draft = reactive({
  type: props.component?.type ?? '',
  title: props.component?.title ?? '',
  description: props.component?.description ?? '',
  purpose: props.component?.purpose ?? '',
});
const errors = reactive({ type: '', title: '', description: '', purpose: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.type = draft.type.trim()
    ? ''
    : 'Enter a type, e.g. service or software.';
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.description = draft.description.trim() ? '' : 'Enter a description.';
  errors.purpose = draft.purpose.trim() ? '' : 'Enter its purpose.';
  if (Object.values(errors).some(Boolean)) return;
  saving.value = true;
  saveError.value = '';
  const body = {
    uuid: props.component?.uuid ?? uuidv4(),
    type: draft.type.trim(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    purpose: draft.purpose.trim(),
    props: [],
    links: [],
  };
  try {
    if (props.component) {
      const response = await api.put<{ data: DefinedComponent }>(
        `${base}/${body.uuid}`,
        body,
        { transformRequest: [decamelizeKeys] },
      );
      emit('updated', response.data.data);
    } else {
      // The API creates components in batches.
      const response = await api.post<{ data: DefinedComponent[] }>(
        base,
        [body],
        {
          transformRequest: [decamelizeKeys],
        },
      );
      const created = response.data.data?.[0];
      if (!created?.uuid)
        throw new Error('No component was created. Try again.');
      emit('created', created);
    }
    toast.add({
      severity: 'success',
      summary: props.component ? 'Component saved' : 'Component added',
      life: 3000,
    });
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
      <Grid min="sm" gap="4">
        <FormField label="Title" required :error="errors.title">
          <TextInput v-model="draft.title" />
        </FormField>
        <FormField label="Type" required :error="errors.type">
          <TextInput v-model="draft.type" :options="typeOptions" />
        </FormField>
      </Grid>
      <FormField label="Description" required :error="errors.description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <FormField label="Purpose" required :error="errors.purpose">
        <Textarea v-model="draft.purpose" :rows="2" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          component ? 'Save component' : 'Add component'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
