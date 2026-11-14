<script setup lang="ts">
/**
 * Add or edit a POA&M item (title, description, remarks). Saves the item itself and emits
 * `created` or `saved`; editing keeps the item's links to findings, observations and risks.
 */
import { reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { POAMItem } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ poamId: string; item?: POAMItem }>();
const emit = defineEmits<{
  created: [item: POAMItem];
  saved: [item: POAMItem];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/plan-of-action-and-milestones/${props.poamId}/poam-items`;

const draft = reactive({
  title: props.item?.title ?? '',
  description: props.item?.description ?? '',
  remarks: props.item?.remarks ?? '',
});
const errors = reactive({ title: '', description: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.description = draft.description.trim()
    ? ''
    : 'Describe the weakness being tracked.';
  if (errors.title || errors.description) return;
  saving.value = true;
  saveError.value = '';
  const body: POAMItem = {
    ...(props.item ?? { uuid: uuid() }),
    title: draft.title.trim(),
    description: draft.description.trim(),
    remarks: draft.remarks.trim() || undefined,
  };
  try {
    const response = props.item
      ? await api.put<{ data: POAMItem }>(`${base}/${props.item.uuid}`, body, {
          transformRequest: [decamelizeKeys],
        })
      : await api.post<{ data: POAMItem }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    toast.add({
      severity: 'success',
      summary: props.item ? 'Item saved' : 'Item added',
      life: 3000,
    });
    if (props.item) emit('saved', response.data.data);
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
        <Textarea v-model="draft.description" :rows="4" />
      </FormField>
      <FormField label="Remarks">
        <Textarea v-model="draft.remarks" :rows="2" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          item ? 'Save item' : 'Add item'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
