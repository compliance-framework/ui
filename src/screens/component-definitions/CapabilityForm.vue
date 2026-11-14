<script setup lang="ts">
/**
 * Add or edit a component definition capability: its name and description. The API stores only
 * these here (its props and links aren't saved), so the form offers only these.
 */
import { reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { v4 as uuidv4 } from 'uuid';
import type { Capability } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  componentDefinitionId: string;
  capability?: Capability;
}>();
const emit = defineEmits<{
  created: [capability: Capability];
  updated: [capability: Capability];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/component-definitions/${props.componentDefinitionId}/capabilities`;

const draft = reactive({
  name: props.capability?.name ?? '',
  description: props.capability?.description ?? '',
});
const errors = reactive({ name: '', description: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.name = draft.name.trim() ? '' : 'Enter a name.';
  errors.description = draft.description.trim() ? '' : 'Enter a description.';
  if (errors.name || errors.description) return;
  saving.value = true;
  saveError.value = '';
  const body = {
    uuid: props.capability?.uuid ?? uuidv4(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    props: [],
    links: [],
  };
  try {
    if (props.capability) {
      const response = await api.put<{ data: Capability }>(
        `${base}/${body.uuid}`,
        body,
        { transformRequest: [decamelizeKeys] },
      );
      emit('updated', response.data.data);
    } else {
      // The API creates capabilities in batches.
      const response = await api.post<{ data: Capability[] }>(base, [body], {
        transformRequest: [decamelizeKeys],
      });
      const created = response.data.data?.[0];
      if (!created?.uuid)
        throw new Error('No capability was created. Try again.');
      emit('created', created);
    }
    toast.add({
      severity: 'success',
      summary: props.capability ? 'Capability saved' : 'Capability added',
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
      <FormField label="Name" required :error="errors.name">
        <TextInput v-model="draft.name" />
      </FormField>
      <FormField label="Description" required :error="errors.description">
        <Textarea v-model="draft.description" :rows="4" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          capability ? 'Save capability' : 'Add capability'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
