<script setup lang="ts">
/** Add or edit an export offering's title and description. Emits `created` or `saved`. */
import { reactive, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { SSPExportOffering } from '@/types/ssp-export-offerings';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; offering?: SSPExportOffering }>();
const emit = defineEmits<{
  created: [offering: SSPExportOffering];
  saved: [offering: SSPExportOffering];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/system-security-plans/${props.sspId}/export-offerings`;

const draft = reactive({
  title: props.offering?.title ?? '',
  description: props.offering?.description ?? '',
});
const titleError = ref('');
const saving = ref(false);
const saveError = ref('');

async function save() {
  titleError.value = draft.title.trim() ? '' : 'Enter a title.';
  if (titleError.value || saving.value) return;
  saving.value = true;
  saveError.value = '';
  const body = { title: draft.title.trim(), description: draft.description };
  try {
    if (props.offering) {
      const response = await api.put<{ data: SSPExportOffering }>(
        `${base}/${props.offering.id}`,
        body,
      );
      emit('saved', response.data.data);
    } else {
      const response = await api.post<{ data: SSPExportOffering }>(base, body);
      emit('created', response.data.data);
    }
    toast.add({
      severity: 'success',
      summary: props.offering ? 'Offering saved' : 'Offering created',
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
      <FormField label="Title" required :error="titleError">
        <TextInput v-model="draft.title" />
      </FormField>
      <FormField
        label="Description"
        hint="What other systems inherit if they subscribe."
      >
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          offering ? 'Save offering' : 'Create offering'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
