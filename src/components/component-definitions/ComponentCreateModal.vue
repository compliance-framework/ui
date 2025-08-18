<template>
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <ComponentCreateForm
        @created="done"
        :component-definition-id="componentDefinitionId"
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
  </Modal>
</template>

<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue';
import Modal from '@/components/Modal.vue';
import ComponentCreateForm from '@/components/component-definitions/ComponentCreateForm.vue';
import type { DefinedComponent } from '@/stores/component-definitions.ts';

const show = defineModel<boolean>();

const emit = defineEmits({
  created(component: DefinedComponent) {
    return !!component.uuid;
  },
});

const props = defineProps<{
  componentDefinitionId: string;
}>();

function done(component: DefinedComponent) {
  show.value = false;
  emit('created', component);
}
</script>
