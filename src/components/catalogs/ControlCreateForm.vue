<script setup lang="ts">
import type { Catalog, Control, Group } from '@/oscal';
import FormInput from '@/components/forms/FormInput.vue';
import { ref } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const props = defineProps<{
  catalog: Catalog;
  parentGroup?: Group;
  parentControl?: Control;
}>();

const emit = defineEmits({
  created(control: Control) {
    return !!control.id;
  },
});

const control = ref({} as Control);

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
  let response;
  try {
    if (!control.value.id || !control.value.title) {
      throw new Error('ID and Title are required');
    }
    if (props.parentControl) {
      if (!props.parentControl.id) {
        throw new Error('Parent Control ID is required');
      }
      response = await executeCreateNestedControl({ data: control.value });
    } else if (props.parentGroup) {
      if (!props.parentGroup.id) {
        throw new Error('Parent Group ID is required');
      }
      response = await executeCreateGroupControl({ data: control.value });
    } else {
      response = await executeCreateControl({ data: control.value });
    }
    if (response.data.value) {
      emit('created', response.data.value.data);
    }
  } catch (error) {
    console.error('Error creating control:', error);
  }
}
</script>

<template>
  <form @submit.prevent="createControl()">
    <div class="mb-4">
      <label class="inline-block pb-2">ID</label>
      <FormInput v-model="control.id" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Class</label>
      <FormInput v-model="control.class" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Title</label>
      <FormInput v-model="control.title" />
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>
