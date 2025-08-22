<template>
  <Dialog
    v-model:visible="showDefinitionEditDialog"
    @hide="$emit('close')"
    modal
  >
    <div class="px-12 py-8">
      <ImportDefinitionEditForm
        :component-definition-id="componentDefinitionId"
        :import-definition="importDefinition"
        :all-import-definitions="allImportDefinitions"
        @updated="handleUpdated"
        @cancel="$emit('close')"
      />
    </div>
    <div
      class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4"
    >
      <PrimaryButton
        @click="$emit('close')"
        class="px-2 py-1 border-ccf-300 dark:border-slate-700 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import ImportDefinitionEditForm from './ImportDefinitionEditForm.vue';
import type { ImportComponentDefinition } from '@/stores/component-definitions.ts';
import { ref } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  componentDefinitionId: string;
  importDefinition: ImportComponentDefinition;
  allImportDefinitions: ImportComponentDefinition[];
}>();

const showDefinitionEditDialog = ref(props.isOpen);

const emit = defineEmits<{
  close: [];
  updated: [importDefinitions: ImportComponentDefinition[]];
}>();

function handleUpdated(updatedImportDefinitions: ImportComponentDefinition[]) {
  emit('updated', updatedImportDefinitions);
  emit('close');
}
</script>
