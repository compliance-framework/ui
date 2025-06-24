<template>
  <Modal :show="isOpen" @close="$emit('close')">
    <div class="px-12 py-8">
      <BackMatterResourceCreateForm
        :component-definition-id="componentDefinitionId"
        @created="handleCreated"
        @cancel="$emit('close')"
      />
    </div>
    <div class="border-t border-zinc-300 dark:border-slate-700 text-right py-4 px-4">
      <PrimaryButton
        @click="$emit('close')"
        class="px-2 py-1 border-zinc-500 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import BackMatterResourceCreateForm from './BackMatterResourceCreateForm.vue'
import type { BackMatterResource } from '@/stores/component-definitions.ts'

defineProps<{
  isOpen: boolean
  componentDefinitionId: string
}>()

const emit = defineEmits<{
  close: []
  created: [resource: BackMatterResource]
}>()

function handleCreated(resource: BackMatterResource) {
  emit('created', resource)
  emit('close')
}
</script>