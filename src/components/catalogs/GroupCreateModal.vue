<script setup lang="ts">
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import type { Catalog, Group } from '@/oscal';
import GroupCreateForm from '@/components/catalogs/GroupCreateForm.vue';

const show = defineModel<boolean>();

const emit = defineEmits({
  created(group: Group) {
    return !!group.id;
  },
});

const props = defineProps<{
  catalog: Catalog;
  parent?: Group;
}>();

function done(group: Group) {
  show.value = false;
  emit('created', group);
}
</script>

<template>
  <Dialog v-model:open="show" title="New group">
    <GroupCreateForm
      v-if="show"
      :parent="props.parent"
      :catalog="props.catalog"
      @created="done"
      @cancel="show = false"
    />
  </Dialog>
</template>
