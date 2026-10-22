<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Edit Filter"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <FilterForm
      v-if="dashboard"
      :dashboard="dashboard"
      submit-label="Save"
      show-cancel
      @submit="submit"
      @cancel="visible = false"
    />
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import FilterForm from '@/views/dashboard/partials/FilterForm.vue';
import type { Dashboard, DashboardCreate } from '@/stores/filters.ts';
import { useDataApi } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';

const visible = defineModel<boolean>('visible', { required: true });

const props = defineProps<{
  dashboard: Dashboard | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const toast = useToast();

const { execute: updateDashboard } = useDataApi<Dashboard>(
  null,
  {
    method: 'PUT',
    // /api/filters is a camelCase API: no decamelizeKeys, or followSspScope and sspId
    // would go out kebab-cased.
  },
  { immediate: false },
);

async function submit(payload: DashboardCreate) {
  if (!props.dashboard?.id) {
    return;
  }
  try {
    await updateDashboard(`/api/filters/${props.dashboard.id}`, {
      data: payload,
    });
    visible.value = false;
    emit('saved');
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `Filter "${payload.name}" updated`,
      life: 3000,
    });
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update filter',
      life: 3000,
    });
  }
}
</script>
