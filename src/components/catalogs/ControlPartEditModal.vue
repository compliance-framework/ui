<script setup lang="ts">
import type { Catalog, Control, Part } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Label from '@/volt/Label.vue';
import Textarea from '@/volt/Textarea.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { computed, ref, watch, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useFormSubmit } from '@/composables/useFormSubmit';

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(control: Control) {
    return !!control.id;
  },
});

const props = defineProps<{
  catalog: Catalog;
  control: Control;
  type: 'statement' | 'assessment-objective' | 'guidance';
}>();

const toast = useToast();
const prose = ref<string>('');
const {
  errorMessage,
  isSubmitting,
  resetFormState,
  validate,
  getErrorMessage,
} = useFormSubmit([], 'Failed to update control.');
const partLabel = computed(() =>
  props.type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
);

watchEffect(() => {
  const p = props.control.parts?.find((pp) => pp.name === props.type);
  prose.value = p?.prose || '';
});

watch(show, (open) => {
  if (open) resetFormState();
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

function newPartId() {
  return `${props.type}-${uuidv4()}`;
}

async function submit() {
  if (!validate()) return;

  const nextParts: Part[] = [...(props.control.parts || [])];
  const idx = nextParts.findIndex((p) => p.name === props.type);
  if (idx >= 0) {
    nextParts[idx] = { ...nextParts[idx], prose: prose.value };
  } else {
    nextParts.push({
      id: newPartId(),
      name: props.type,
      prose: prose.value,
    });
  }
  const payload: Control = { ...props.control, parts: nextParts };
  isSubmitting.value = true;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Control updated',
        detail: `${props.type} saved`,
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
    :header="`Edit ${partLabel}`"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <Label for="control-part-text">Text</Label>
        <Textarea
          id="control-part-text"
          v-model="prose"
          :placeholder="`Enter ${partLabel.toLowerCase()} text`"
          rows="8"
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
          Save Text
        </PrimaryButton>
      </div>
    </form>
  </Dialog>
</template>
