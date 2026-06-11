<script setup lang="ts">
import type { Catalog, Control, Group } from '@/oscal';
import { reactive, ref } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Message from '@/volt/Message.vue';
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
  cancel() {
    return true;
  },
});

const control = reactive<Partial<Control>>({
  id: '',
  title: '',
});
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);

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

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!control.id?.trim()) {
    errors.id = 'Control ID is required';
  }
  if (!control.title?.trim()) {
    errors.title = 'Title is required';
  }

  return Object.keys(errors).length === 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to create control.';
}

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
  <form @submit.prevent="createControl" class="space-y-6">
    <div>
      <Label for="control-id" required>ID</Label>
      <InputText
        id="control-id"
        v-model="control.id"
        placeholder="e.g. ac-1"
        class="w-full"
        :invalid="!!errors.id"
      />
      <small v-if="errors.id" class="text-red-500">{{ errors.id }}</small>
    </div>

    <div>
      <Label for="control-class">Class</Label>
      <InputText
        id="control-class"
        v-model="control.class"
        placeholder="Optional class"
        class="w-full"
      />
    </div>

    <div>
      <Label for="control-title" required>Title</Label>
      <InputText
        id="control-title"
        v-model="control.title"
        placeholder="Enter control title"
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
        Create Control
      </PrimaryButton>
    </div>
  </form>
</template>
