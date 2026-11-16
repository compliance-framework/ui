<script setup lang="ts">
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { Catalog, Group } from '@/oscal';
import { reactive } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useFormSubmit } from '@/composables/useFormSubmit';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const props = defineProps<{
  catalog: Catalog;
  parent?: Group;
}>();

const emit = defineEmits({
  created(group: Group) {
    return !!group.id;
  },
  cancel() {
    return true;
  },
});

const { execute: executeCreateGroup } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
  { immediate: false },
);

const { execute: executeCreateGroupGroup } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.parent?.id}/groups`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
  { immediate: false },
);

const group = reactive<Partial<Group>>({
  id: '',
  title: '',
});
const { errors, errorMessage, isSubmitting, validate, getErrorMessage } =
  useFormSubmit(
    [
      {
        key: 'id',
        message: 'Group ID is required',
        isMissing: () => !group.id?.trim(),
      },
      {
        key: 'title',
        message: 'Title is required',
        isMissing: () => !group.title?.trim(),
      },
    ],
    'An error occurred while creating the group.',
  );

async function createGroup(): Promise<void> {
  if (!validate()) return;

  let response;
  isSubmitting.value = true;
  try {
    if (props.parent) {
      if (!props.parent.id) {
        throw new Error('Parent Group ID is required');
      }
      response = await executeCreateGroupGroup({
        method: 'POST',
        data: group as Group,
        headers: { 'Content-Type': 'application/json' },
        transformRequest: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data, headers) => decamelizeKeys(data as any, headers as any),
        ],
      });
    } else {
      response = await executeCreateGroup({
        method: 'POST',
        data: group as Group,
        headers: { 'Content-Type': 'application/json' },
        transformRequest: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data, headers) => decamelizeKeys(data as any, headers as any),
        ],
      });
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
  <form novalidate @submit.prevent="createGroup">
    <Stack gap="4">
      <FormField
        label="ID"
        required
        hint="e.g. ac"
        :error="errors.id || undefined"
      >
        <TextInput v-model="group.id" />
      </FormField>
      <FormField label="Title" required :error="errors.title || undefined">
        <TextInput v-model="group.title" />
      </FormField>
      <FormField label="Class" hint="Optional">
        <TextInput v-model="group.class" />
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
          >Create group</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
