<script setup lang="ts">
import type { Catalog, Group } from '@/oscal';
import FormInput from '@/components/forms/FormInput.vue';
import { ref } from 'vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';

const props = defineProps<{
  catalog: Catalog;
  parent?: Group;
}>();

const emit = defineEmits({
  created(group: Group) {
    return !!group.id;
  },
});

const { execute: executeCreateGroup } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
);

const { execute: executeCreateGroupGroup } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.parent?.id}/groups`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
);

const group = ref({} as Group);

async function createGroup(): Promise<void> {
  let response;
  try {
    if (props.parent) {
      response = await executeCreateGroupGroup({
        data: group.value,
      });
    } else {
      response = await executeCreateGroup({
        data: group.value,
      });
    }

    if (response.data.value) {
      emit('created', response.data.value.data);
    }
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    console.error(
      'Error creating group:',
      errorResponse.response?.data.errors.body ||
        'An error occurred while creating the group.',
    );
    return;
  }
}
</script>

<template>
  <form @submit.prevent="createGroup()">
    <div class="mb-4">
      <label class="inline-block pb-2">ID</label>
      <FormInput v-model="group.id" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Class</label>
      <FormInput v-model="group.class" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Title</label>
      <FormInput v-model="group.title" />
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>
