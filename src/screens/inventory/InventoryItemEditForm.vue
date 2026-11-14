<script setup lang="ts">
/** Edit an inventory item in a security plan: its description and remarks. Emits `saved` (the page confirms it). */
import { reactive, ref } from 'vue';
import type { InventoryItem } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; inventoryItem: InventoryItem }>();
const emit = defineEmits<{ saved: [item: InventoryItem]; cancel: [] }>();

const api = useAuthenticatedInstance();

const draft = reactive({
  description: props.inventoryItem.description ?? '',
  remarks: props.inventoryItem.remarks ?? '',
});
const descriptionError = ref('');
const saving = ref(false);
const saveError = ref('');

async function save() {
  descriptionError.value = draft.description.trim()
    ? ''
    : 'Enter a description.';
  if (descriptionError.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    const response = await api.put<{ data: InventoryItem }>(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation/inventory-items/${props.inventoryItem.uuid}`,
      {
        ...props.inventoryItem,
        description: draft.description.trim(),
        remarks: draft.remarks.trim() || undefined,
      },
      { transformRequest: [decamelizeKeys] },
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
    <Stack gap="4">
      <FormField label="Description" required :error="descriptionError">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <FormField label="Remarks"
        ><Textarea v-model="draft.remarks" :rows="2"
      /></FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving"
          >Save item</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
