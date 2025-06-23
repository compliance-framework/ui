<script setup lang="ts">
import type { Catalog, Group } from '@/stores/catalogs.ts'
import GroupCreateForm from '@/components/catalogs/GroupCreateForm.vue'
import Dialog from '@/volt/Dialog.vue'

const show = defineModel<boolean>();

const emit = defineEmits({
  created(group: Group) {
    return !!group.id;
  }
})

const props = defineProps<{
  catalog: Catalog,
  parent?: Group,
}>()

function done(group: Group) {
  show.value = false
  emit('created', group)
}
</script>

<template>
  <Dialog v-model:visible="show" modal header="Create a new group">
    <div class="px-12 py-4">
      <GroupCreateForm @created="done" :parent="props.parent" :catalog="props.catalog" />
    </div>
  </Dialog>
</template>

