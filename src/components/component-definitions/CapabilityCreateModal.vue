<template>
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <CapabilityCreateForm @created="done" :component-definition-id="componentDefinitionId" />
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
import CapabilityCreateForm from '@/components/component-definitions/CapabilityCreateForm.vue'
import type { Capability } from '@/stores/component-definitions.ts'

const show = defineModel<boolean>()

const emit = defineEmits({
  created(capability: Capability) {
    return !!capability.uuid
  }
})

const props = defineProps<{
  componentDefinitionId: string
}>()

function done(capability: Capability) {
  show.value = false
  emit('created', capability)
}
</script>
