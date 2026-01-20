<script setup lang="ts">
import type { Catalog, Control, Part } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { ref, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { v4 as uuidv4 } from 'uuid';
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
  type: 'statement' | 'assessment-objective' | 'guidance';
}>();

const toast = useToast();
const prose = ref<string>('');

watchEffect(() => {
  const p = props.control.parts?.find((pp) => pp.name === props.type);
  prose.value = p?.prose || '';
});

const { execute: update } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [
      (data, headers) => decamelizeKeys(data as any, headers as any),
    ],
  },
  { immediate: false },
);

function newPartId() {
  return `${props.type}-${uuidv4()}`;
}

async function submit() {
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
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: e instanceof Error ? e.message : 'Failed to update control.',
      life: 3000,
    });
  }
}
</script>

<template>
  <Dialog v-model:visible="show" modal :header="'Edit ' + type">
    <div class="px-12 py-4">
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="inline-block pb-2">Text</label>
          <FormInput v-model="prose" />
        </div>
        <PrimaryButton type="submit">Save</PrimaryButton>
      </form>
    </div>
  </Dialog>
</template>
