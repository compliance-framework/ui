<script setup lang="ts">
import type { Catalog, Group } from '@/oscal';
import GroupCreateForm from '@/components/catalogs/GroupCreateForm.vue';
import Dialog from '@/volt/Dialog.vue';

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
  <Dialog
    v-model:visible="show"
    modal
    header="Create Group"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <GroupCreateForm
      @created="done"
      @cancel="show = false"
      :parent="props.parent"
      :catalog="props.catalog"
    />
  </Dialog>
</template>
