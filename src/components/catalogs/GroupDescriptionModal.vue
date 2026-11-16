<script setup lang="ts">
import Button from '@/ds/components/Button/Button.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { Catalog, Group, Part } from '@/oscal';
import { ref, watch, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useFormSubmit } from '@/composables/useFormSubmit';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(group: Group) {
    return !!group.id;
  },
});

const props = defineProps<{
  catalog: Catalog;
  group: Group;
}>();

const toast = useToast();
const description = ref<string>('');
const {
  errorMessage,
  isSubmitting,
  resetFormState,
  validate,
  getErrorMessage,
} = useFormSubmit([], 'Failed to update description.');

watchEffect(() => {
  const d = props.group.parts?.find((p) => p.name === 'description');
  description.value = d?.prose || '';
});

watch(show, (open) => {
  if (open) resetFormState();
});

const { execute: update } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data, headers) => decamelizeKeys(data as any, headers as any),
    ],
  },
  { immediate: false },
);

function newPartId() {
  return `description-${uuidv4()}`;
}

async function submit() {
  if (!validate()) return;

  const nextParts: Part[] = [...(props.group.parts || [])];
  const idx = nextParts.findIndex((p) => p.name === 'description');
  if (idx >= 0) {
    nextParts[idx] = { ...nextParts[idx], prose: description.value };
  } else {
    nextParts.push({
      id: newPartId(),
      name: 'description',
      prose: description.value,
    });
  }
  const payload: Group = { ...props.group, parts: nextParts };
  isSubmitting.value = true;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Group updated',
        detail: 'Description saved',
        life: 3000,
      });
      emit('updated', updated);
      show.value = false;
    }
  } catch (e) {
    errorMessage.value = getErrorMessage(e);
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: errorMessage.value,
      life: 3000,
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="show" title="Edit group description" size="l">
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <FormField label="Description">
          <Textarea v-model="description" :rows="6" />
        </FormField>
        <InlineMessage v-if="errorMessage" tone="error" title="Not saved">
          <p>{{ errorMessage }}</p>
        </InlineMessage>
        <Cluster justify="end" gap="2">
          <Button @click="show = false">Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            :loading="isSubmitting"
            :disabled-reason="
              can(RESOURCES.CATALOG, ACTIONS.UPDATE)
                ? undefined
                : permissionTooltip(RESOURCES.CATALOG, ACTIONS.UPDATE)
            "
            >Save description</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>
