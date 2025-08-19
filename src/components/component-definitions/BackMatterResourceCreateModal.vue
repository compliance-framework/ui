<template>
  <Dialog v-model:visible="isOpen" @hide="$emit('close')" modal>
    <div class="px-12 py-8">
      <BackMatterResourceCreateForm
        :component-definition-id="componentDefinitionId"
        @created="handleCreated"
        @cancel="$emit('close')"
      />
    </div>
    <div class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4">
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