<script setup lang="ts">
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import type { Catalog, Control, Group } from '@/oscal';
import ControlCreateForm from '@/components/catalogs/ControlCreateForm.vue';

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
  <Dialog v-model:open="show" title="New control">
    <ControlCreateForm
      v-if="show"
      :catalog="catalog"
      :parent-group="props.parentGroup"
      :parent-control="props.parentControl"
      @created="done"
      @cancel="show = false"
    />
  </Dialog>
</template>
