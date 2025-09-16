<template>
  <Dialog v-model:visible="show" modal>
    <div class="px-12 py-8">
      <ComponentEditForm
        @updated="done"
        :component-definition-id="componentDefinitionId"
        :component="component"
      />
    </div>
    <div
      class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4"
    >
      <PrimaryButton
        @click="show = false"
        class="px-2 py-1 border-ccf-300 dark:border-slate-700 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import ComponentEditForm from '@/components/component-definitions/ComponentEditForm.vue';
import type { DefinedComponent } from '@/oscal';

const show = defineModel<boolean>();

const emit = defineEmits<{
  updated: [component: DefinedComponent];
}>();

defineProps<{
  componentDefinitionId: string;
  component: DefinedComponent;
}>();

function done(component: DefinedComponent) {
  show.value = false;
  emit('updated', component);
}
</script>
