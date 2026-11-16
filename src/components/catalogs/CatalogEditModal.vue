<script setup lang="ts">
import Button from '@/ds/components/Button/Button.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { Catalog } from '@/oscal';
import { reactive, watch, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from '@/ds/toasts';
import { useFormSubmit } from '@/composables/useFormSubmit';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(catalog: Catalog) {
    return !!catalog.uuid;
  },
});

const props = defineProps<{
  catalog: Catalog;
}>();

const toast = useToast();
const form = reactive({ title: '', version: '' });
const {
  errors,
  errorMessage,
  isSubmitting,
  resetFormState,
  validate,
  getErrorMessage,
} = useFormSubmit(
  [
    {
      key: 'title',
      message: 'Title is required',
      isMissing: () => !form.title.trim(),
    },
  ],
  'Failed to update catalog.',
);

watchEffect(() => {
  form.title = props.catalog?.metadata?.title || '';
  form.version = props.catalog?.metadata?.version || '';
});

watch(show, (open) => {
  if (open) resetFormState();
});

const { execute: update } = useDataApi<Catalog>(
  `/api/oscal/catalogs/${props.catalog.uuid}`,
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

async function submit() {
  if (!validate()) return;

  const payload: Catalog = {
    ...props.catalog,
    metadata: {
      ...(props.catalog.metadata || {}),
      title: form.title,
      version: form.version,
    },
  } as Catalog;
  isSubmitting.value = true;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Catalog updated',
        detail: 'Catalog metadata saved',
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
  <Dialog v-model:open="show" title="Edit catalog">
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <FormField label="ID" readonly>
          <TextInput :model-value="props.catalog.uuid" />
        </FormField>
        <FormField label="Title" required :error="errors.title || undefined">
          <TextInput v-model="form.title" />
        </FormField>
        <FormField label="Version" hint="e.g. 1.0.0">
          <TextInput v-model="form.version" />
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
            >Save catalog</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>
