<template>
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <ComponentEditForm 
        @updated="done" 
        :component-definition-id="componentDefinitionId"
        :component="component"
      />
    </div>
    <div class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4">
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
import PrimaryButton from '@/components/PrimaryButton.vue'
import Modal from '@/components/Modal.vue'
import ComponentEditForm from '@/components/component-definitions/ComponentEditForm.vue'

const show = defineModel<boolean>()

const emit = defineEmits<{
  updated: [component: any]
}>()

const props = defineProps<{
  componentDefinitionId: string
  component: any
}>()

function done(component: any) {
  show.value = false
  emit('updated', component)
}
</script>