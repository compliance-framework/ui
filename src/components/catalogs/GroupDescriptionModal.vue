<script setup lang="ts">
import type { Catalog, Group, Part } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { ref, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';

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

watchEffect(() => {
  const d = props.group.parts?.find((p) => p.name === 'description');
  description.value = d?.prose || '';
});

const { execute: update } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}`,
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
  return `description-${uuidv4()}`;
}

async function submit() {
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
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: e instanceof Error ? e.message : 'Failed to update description.',
      life: 3000,
    });
  }
}
</script>

<template>
  <Dialog v-model:visible="show" modal header="Edit Group Description">
    <div class="px-12 py-4">
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="inline-block pb-2">Description</label>
          <FormInput v-model="description" />
        </div>
        <PrimaryButton type="submit">Save</PrimaryButton>
      </form>
    </div>
  </Dialog>
</template>
