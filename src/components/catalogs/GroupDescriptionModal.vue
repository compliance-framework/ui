<script setup lang="ts">
import type { Catalog, Group, Part } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Label from '@/volt/Label.vue';
import Textarea from '@/volt/Textarea.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { ref, watch, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useFormSubmit } from '@/composables/useFormSubmit';

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
  <Dialog
    v-model:visible="show"
    modal
    header="Edit Group Description"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <Label for="group-description">Description</Label>
        <Textarea
          id="group-description"
          v-model="description"
          placeholder="Enter group description"
          rows="6"
          class="w-full"
        />
      </div>

      <Message v-if="errorMessage" severity="error">
        {{ errorMessage }}
      </Message>

      <div
        class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton type="button" @click="show = false">
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" :disabled="isSubmitting">
          <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
          Save Description
        </PrimaryButton>
      </div>
    </form>
  </Dialog>
</template>
