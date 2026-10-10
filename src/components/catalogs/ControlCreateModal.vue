<script setup lang="ts">
import type { Catalog, Control, Group } from '@/oscal';
import ControlCreateForm from '@/components/catalogs/ControlCreateForm.vue';
import Dialog from '@/volt/Dialog.vue';

const show = defineModel<boolean>();

const emit = defineEmits({
  created(control: Control) {
    return !!control.id;
  },
});

const props = defineProps<{
  catalog: Catalog;
  parentGroup?: Group;
  parentControl?: Control;
}>();

function done(control: Control) {
  show.value = false;
  emit('created', control);
}
</script>

<template>
  <Dialog
    v-model:visible="show"
    modal
    header="Create Control"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <ControlCreateForm
      @created="done"
      @cancel="show = false"
      :catalog="catalog"
      :parent-group="props.parentGroup"
      :parent-control="props.parentControl"
    />
  </Dialog>
</template>
