<script setup lang="ts">
import type { Catalog, Control, Group } from '@/stores/catalogs.ts'
import ControlCreateForm from '@/components/catalogs/ControlCreateForm.vue'
import Dialog from '@/volt/Dialog.vue'

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
  <Dialog v-model:visible="show" modal header="Create a new control">
    <div class="px-12 py-4">
      <ControlCreateForm @created="done" :catalog="catalog" :parent-group="props.parentGroup" :parent-control="props.parentControl" />
    </div>
  </Dialog>
</template>

