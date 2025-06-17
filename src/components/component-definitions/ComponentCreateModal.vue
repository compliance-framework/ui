<template>
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <ComponentCreateForm @created="done" :component-definition-id="componentDefinitionId" />
    </div>
    <div class="border-t border-zinc-300 dark:border-slate-700 text-right py-4 px-4">
      <PrimaryButton
        @click="show = false"
        class="px-2 py-1 border-zinc-500 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue'
import Modal from '@/components/Modal.vue'
import ComponentCreateForm from '@/components/component-definitions/ComponentCreateForm.vue'

const show = defineModel<boolean>()

const emit = defineEmits({
  created(component: any) {
    return !!component.uuid
  }
})

const props = defineProps<{
  componentDefinitionId: string
}>()

function done(component: any) {
  show.value = false
  emit('created', component)
}
</script>