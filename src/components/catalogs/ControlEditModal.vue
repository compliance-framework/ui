<script setup lang="ts">
import type { Catalog, Control } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { reactive, ref, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(control: Control) {
    return !!control.id;
  },
});

const props = defineProps<{
  catalog: Catalog;
  control: Control;
}>();

const toast = useToast();
const form = reactive({ title: '', class: '' });
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);

watchEffect(() => {
  form.title = props.control?.title || '';
  form.class = props.control?.class || '';
});

const { execute: update } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}`,
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

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!form.title.trim()) {
    errors.title = 'Title is required';
  }

  return Object.keys(errors).length === 0;
}

async function submit() {
  if (!validate()) return;

  const payload: Control = {
    ...props.control,
    title: form.title,
    class: form.class || undefined,
  } as Control;
  isSubmitting.value = true;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Control updated',
        detail: 'Control saved',
        life: 3000,
      });
      emit('updated', updated);
      show.value = false;
    }
  } catch (e) {
    errorMessage.value =
      e instanceof Error ? e.message : 'Failed to update control.';
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
    header="Edit Control"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <Label for="control-edit-id">ID</Label>
        <InputText
          id="control-edit-id"
          :model-value="props.control.id"
          class="w-full"
          disabled
        />
      </div>
      <div>
        <Label for="control-edit-title" required>Title</Label>
        <InputText
          id="control-edit-title"
          v-model="form.title"
          placeholder="Enter control title"
          class="w-full"
          :invalid="!!errors.title"
        />
        <small v-if="errors.title" class="text-red-500">
          {{ errors.title }}
        </small>
      </div>
      <div>
        <Label for="control-edit-class">Class</Label>
        <InputText
          id="control-edit-class"
          v-model="form.class"
          placeholder="Optional class"
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
          Save Control
        </PrimaryButton>
      </div>
    </form>
  </Dialog>
</template>
