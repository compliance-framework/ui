<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCollapsibleGroupsStore } from '@/stores/collapsibleGroups';

const props = defineProps({
  open: Boolean,
  // Opt-in: when set, expand/collapse state is persisted (keyed by this string) instead
  // of being purely local to this component instance, so it survives a hard refresh.
  persistKey: String,
});

const collapsibleGroupsStore = useCollapsibleGroupsStore();
const localOpen = ref<boolean>(props.open);

const isOpen = computed<boolean>(() =>
  props.persistKey
    ? collapsibleGroupsStore.isOpen(props.persistKey)
    : localOpen.value,
);

function toggleOpen() {
  if (props.persistKey) {
    collapsibleGroupsStore.setOpen(props.persistKey, !isOpen.value);
  } else {
    localOpen.value = !localOpen.value;
  }
}
</script>

<template>
  <div class="border-b border-ccf-300 dark:border-slate-800">
    <div
      @click="toggleOpen"
      :class="{
        'cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-800': true,
      }"
    >
      <slot name="header" :is-open="isOpen"></slot>
    </div>
    <div v-if="isOpen" class="bg-white dark:bg-slate-900">
      <slot></slot>
    </div>
  </div>
</template>
