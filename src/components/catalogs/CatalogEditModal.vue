<script setup lang="ts">
import type { Catalog } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { ref, watchEffect } from 'vue';
import { useDataApi } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(catalog: Catalog) {
    return !!catalog.uuid;
  },
});

const props = defineProps<{
  catalog: Catalog;
}>();

const toast = useToast();
const form = ref({ title: '', version: '' });

watchEffect(() => {
  form.value.title = props.catalog?.metadata?.title || '';
  form.value.version = props.catalog?.metadata?.version || '';
});

const { execute: update } = useDataApi<Catalog>(
  `/api/oscal/catalogs/${props.catalog.uuid}`,
  { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

async function submit() {
  const payload: Catalog = {
    ...props.catalog,
    metadata: {
      ...(props.catalog.metadata || {}),
      title: form.value.title,
      version: form.value.version,
    },
  } as Catalog;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Catalog updated',
        detail: 'Catalog metadata saved',
        life: 3000,
      });
      emit('updated', updated);
      show.value = false;
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: e instanceof Error ? e.message : 'Failed to update catalog.',
      life: 3000,
    });
  }
}
</script>

<template>
  <Dialog v-model:visible="show" modal header="Edit Catalog">
    <div class="px-12 py-4">
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="inline-block pb-2">Title</label>
          <FormInput v-model="form.title" />
        </div>
        <div class="mb-4">
          <label class="inline-block pb-2">Version</label>
          <FormInput v-model="form.version" />
        </div>
        <PrimaryButton type="submit">Save</PrimaryButton>
      </form>
    </div>
  </Dialog>
</template>
