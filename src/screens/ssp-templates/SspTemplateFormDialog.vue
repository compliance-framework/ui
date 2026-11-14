<script setup lang="ts">
/**
 * The system template form in a dialog: "New system template", or "Edit …" for a saved one. The
 * form mounts on each open, so it starts from the template as it is now.
 */
import type { SspTemplate } from '@/types/ssp-templates';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import SspTemplateForm from './SspTemplateForm.vue';

defineProps<{ template?: SspTemplate | null }>();
const emit = defineEmits<{ saved: [template: SspTemplate | undefined] }>();
const visible = defineModel<boolean>('visible', { required: true });

function saved(template: SspTemplate | undefined) {
  visible.value = false;
  emit('saved', template);
}
</script>

<template>
  <Dialog
    v-model:open="visible"
    :title="template?.id ? `Edit ${template.name}` : 'New system template'"
    size="l"
  >
    <SspTemplateForm
      v-if="visible"
      :template="template"
      @cancel="visible = false"
      @saved="saved"
    />
  </Dialog>
</template>
