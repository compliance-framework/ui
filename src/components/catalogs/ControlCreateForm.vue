<script setup lang="ts">
import type { Catalog, Control, Group } from '@/stores/catalogs.ts';
import FormInput from '@/components/forms/FormInput.vue';
import { ref } from 'vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';

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
  },
);

const { execute: executeCreateNestedControl } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.parentControl?.id}/controls`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
);

const { execute: executeCreateGroupControl } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.parentGroup?.id}/controls`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
);

async function createControl(): Promise<void> {
  let response;
  try {
    if (props.parentControl) {
      response = await executeCreateNestedControl({
        data: control.value,
      });
    } else if (props.parentGroup) {
      response = await executeCreateGroupControl({
        data: control.value,
      });
    } else {
      response = await executeCreateControl({
        data: control.value,
      });
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
