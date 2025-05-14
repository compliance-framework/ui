<script setup lang="ts">
import type { Catalog, Control, Group } from '@/stores/catalogs.ts'
import PrimaryButton from '@/components/PrimaryButton.vue'
import GroupCreateForm from '@/components/catalogs/GroupCreateForm.vue'
import Modal from '@/components/Modal.vue'

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
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <GroupCreateForm @created="done" :parent="props.parent" :catalog="props.catalog" />
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

