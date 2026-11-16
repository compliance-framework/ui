<script setup lang="ts">
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { Catalog, Control, Group } from '@/oscal';
import { reactive } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useFormSubmit } from '@/composables/useFormSubmit';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const props = defineProps<{
  catalog: Catalog;
  parentGroup?: Group;
  parentControl?: Control;
}>();

const emit = defineEmits({
  created(control: Control) {
    return !!control.id;
  },
  cancel() {
    return true;
  },
});

const control = reactive<Partial<Control>>({
  id: '',
  title: '',
});
const { errors, errorMessage, isSubmitting, validate, getErrorMessage } =
  useFormSubmit(
    [
      {
        key: 'id',
        message: 'Control ID is required',
        isMissing: () => !control.id?.trim(),
      },
      {
        key: 'title',
        message: 'Title is required',
        isMissing: () => !control.title?.trim(),
      },
    ],
    'Failed to create control.',
  );

const { execute: executeCreateControl } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data, headers) => decamelizeKeys(data as any, headers as any),
    ],
  },
  { immediate: false },
);

const { execute: executeCreateNestedControl } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.parentControl?.id}/controls`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data, headers) => decamelizeKeys(data as any, headers as any),
    ],
  },
  { immediate: false },
);

const { execute: executeCreateGroupControl } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.parentGroup?.id}/controls`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data, headers) => decamelizeKeys(data as any, headers as any),
    ],
  },
  { immediate: false },
);

async function createControl(): Promise<void> {
  if (!validate()) return;

  let response;
  isSubmitting.value = true;
  try {
    if (props.parentControl) {
      if (!props.parentControl.id) {
        throw new Error('Parent Control ID is required');
      }
      response = await executeCreateNestedControl({ data: control as Control });
    } else if (props.parentGroup) {
      if (!props.parentGroup.id) {
        throw new Error('Parent Group ID is required');
      }
      response = await executeCreateGroupControl({ data: control as Control });
    } else {
      response = await executeCreateControl({ data: control as Control });
    }
    if (response.data.value) {
      emit('created', response.data.value.data);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="createControl">
    <Stack gap="4">
      <FormField
        label="ID"
        required
        hint="e.g. ac-1"
        :error="errors.id || undefined"
      >
        <TextInput v-model="control.id" />
      </FormField>
      <FormField label="Title" required :error="errors.title || undefined">
        <TextInput v-model="control.title" />
      </FormField>
      <FormField label="Class" hint="Optional">
        <TextInput v-model="control.class" />
      </FormField>
      <InlineMessage v-if="errorMessage" tone="error" title="Not saved">
        <p>{{ errorMessage }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="isSubmitting"
          :disabled-reason="
            can(RESOURCES.CATALOG, ACTIONS.CREATE)
              ? undefined
              : permissionTooltip(RESOURCES.CATALOG, ACTIONS.CREATE)
          "
          >Create control</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
