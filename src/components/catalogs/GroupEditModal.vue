<script setup lang="ts">
import type { Catalog, Group } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { ref, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
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
const form = ref({ title: '', class: '' });

watchEffect(() => {
  form.value.title = props.group?.title || '';
  form.value.class = props.group?.class || '';
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

async function submit() {
  const payload: Group = {
    ...props.group,
    title: form.value.title,
    class: form.value.class,
  } as Group;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Group updated',
        detail: 'Group saved',
        life: 3000,
      });
      emit('updated', updated);
      show.value = false;
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: e instanceof Error ? e.message : 'Failed to update group.',
      life: 3000,
    });
  }
}
</script>

<template>
  <Dialog v-model:visible="show" modal header="Edit Group">
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
