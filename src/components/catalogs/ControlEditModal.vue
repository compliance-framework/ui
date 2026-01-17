<script setup lang="ts">
import type { Catalog, Control } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { ref, watchEffect } from 'vue';
import { useDataApi } from '@/composables/axios';
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
const form = ref({ title: '', class: '' });

watchEffect(() => {
  form.value.title = props.control?.title || '';
  form.value.class = props.control?.class || '';
});

const { execute: update } = useDataApi<Control>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}`,
  { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

async function submit() {
  const payload: Control = {
    ...props.control,
    title: form.value.title,
    class: form.value.class || undefined,
  } as Control;
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
  <Dialog v-model:visible="show" modal header="Edit Control">
    <div class="px-12 py-4">
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="inline-block pb-2">Title</label>
          <FormInput v-model="form.title" />
        </div>
        <div class="mb-4">
          <label class="inline-block pb-2">Class</label>
          <FormInput v-model="form.class" />
        </div>
        <PrimaryButton type="submit">Save</PrimaryButton>
      </form>
    </div>
  </Dialog>
</template>
