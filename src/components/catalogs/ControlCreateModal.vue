<script setup lang="ts">
import type { Catalog, Control, Group } from '@/stores/catalogs.ts'
import PrimaryButton from '@/components/PrimaryButton.vue'
import Modal from '@/components/Modal.vue'
import ControlCreateForm from '@/components/catalogs/ControlCreateForm.vue'

const show = defineModel<boolean>();

const emit = defineEmits({
  created(control: Control) {
    return !!control.id;
  }
})

const props = defineProps<{
  catalog: Catalog,
  parentGroup?: Group,
  parentControl?: Control,
}>()

function done(control: Control) {
  show.value = false
  emit('created', control)
}
</script>

<template>
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <ControlCreateForm @created="done" :catalog="catalog" :parent-group="props.parentGroup" :parent-control="props.parentControl" />
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

