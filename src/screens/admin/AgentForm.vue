<script setup lang="ts">
/** Register an agent, or edit one: name, description and whether it is active. Emits `saved`. */
import { reactive, ref } from 'vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import type { Agent, UpsertAgentRequest } from '@/types/agents';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ agent?: Agent }>();
const emit = defineEmits<{ saved: [agent: Agent]; cancel: [] }>();

const api = useAuthenticatedInstance();

const draft = reactive({
  name: props.agent?.name ?? '',
  description: props.agent?.description ?? '',
  isActive: props.agent?.isActive ?? true,
});
const nameError = ref('');
const saveError = ref('');
const saving = ref(false);

async function save() {
  nameError.value = draft.name.trim() ? '' : 'Enter a name.';
  if (nameError.value) return;
  saveError.value = '';
  saving.value = true;
  const body: UpsertAgentRequest = {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    isActive: draft.isActive,
  };
  try {
    const config = { transformRequest: [decamelizeKeys] };
    const response = props.agent
      ? await api.put<{ data: Agent }>(
          `/api/admin/agents/${props.agent.id}`,
          body,
          config,
        )
      : await api.post<{ data: Agent }>('/api/admin/agents', body, config);
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
    <Stack gap="4">
      <FormField
        label="Name"
        required
        hint="e.g. compliance-collector"
        :error="nameError || undefined"
      >
        <TextInput v-model="draft.name" />
      </FormField>
      <FormField label="Description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <Checkbox v-model="draft.isActive" label="Active" />
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          agent ? 'Save agent' : 'Register agent'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
