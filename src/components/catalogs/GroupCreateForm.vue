<script setup lang="ts">
import type { Catalog, Group } from '@/oscal';
import { reactive, ref } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Message from '@/volt/Message.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
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
  class: '',
  title: '',
});
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!group.id?.trim()) {
    errors.id = 'Group ID is required';
  }
  if (!group.title?.trim()) {
    errors.title = 'Title is required';
  }

  return Object.keys(errors).length === 0;
}

function getErrorMessage(error: unknown): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    errorResponse.response?.data.errors?.body ||
    (error instanceof Error
      ? error.message
      : 'An error occurred while creating the group.')
  );
}

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
  <form @submit.prevent="createGroup" class="space-y-6">
    <div>
      <Label for="group-id" required>ID</Label>
      <InputText
        id="group-id"
        v-model="group.id"
        placeholder="e.g. ac"
        class="w-full"
        :invalid="!!errors.id"
      />
      <small v-if="errors.id" class="text-red-500">{{ errors.id }}</small>
    </div>

    <div>
      <Label for="group-class">Class</Label>
      <InputText
        id="group-class"
        v-model="group.class"
        placeholder="Optional class"
        class="w-full"
      />
    </div>

    <div>
      <Label for="group-title" required>Title</Label>
      <InputText
        id="group-title"
        v-model="group.title"
        placeholder="Enter group title"
        class="w-full"
        :invalid="!!errors.title"
      />
      <small v-if="errors.title" class="text-red-500">
        {{ errors.title }}
      </small>
    </div>

    <Message v-if="errorMessage" severity="error">
      {{ errorMessage }}
    </Message>

    <div
      class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
    >
      <SecondaryButton type="button" @click="emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" :disabled="isSubmitting">
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
        Create Group
      </PrimaryButton>
    </div>
  </form>
</template>
