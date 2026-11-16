<script setup lang="ts">
/** A saved evidence filter's form in a dialog. Confirms the save and emits `saved`. */
import { useToast } from '@/ds/toasts';
import type { Dashboard, DashboardCreate } from '@/stores/filters';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import EvidenceFilterForm from './EvidenceFilterForm.vue';

defineProps<{ dashboard: Dashboard | null }>();
const emit = defineEmits<{ saved: [] }>();
const visible = defineModel<boolean>('visible', { required: true });
const toast = useToast();

function saved(payload: DashboardCreate) {
  visible.value = false;
  toast.add({
    severity: 'success',
    summary: 'Filter saved',
    detail: `${payload.name} was saved.`,
    life: 3000,
  });
  emit('saved');
}
</script>

<template>
  <Dialog
    v-model:open="visible"
    :title="dashboard ? `Edit ${dashboard.name}` : 'Edit filter'"
    size="l"
  >
    <EvidenceFilterForm
      v-if="visible && dashboard"
      :dashboard="dashboard"
      @cancel="visible = false"
      @saved="saved"
    />
  </Dialog>
</template>
