<script setup lang="ts">
import { computed, watch } from 'vue';
import ChevronRightIcon from '@primevue/icons/chevronright';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import { useLeftNavCategoriesStore } from '@/stores/leftNavCategories';

const props = defineProps<{
  title: string;
  open?: boolean;
  // Highlights the header to show the currently active route lives under this category
  // (BCH — LHN active-section indicator).
  active?: boolean;
}>();

// Open/closed state lives in this store (persisted to localStorage, keyed by title) rather
// than local component state, so a submenu the user expands — even with nothing under it
// selected — stays open across a hard refresh or a new session.
const categoriesStore = useLeftNavCategoriesStore();
const isOpen = computed(() => categoriesStore.isOpen(props.title));

// Force the category open when it becomes the one containing the active route, so the
// highlighted child link is actually visible. Never auto-collapses it back — a user who
// manually closes it keeps that choice while still browsing inside it.
watch(
  () => props.open,
  (open) => {
    if (open) categoriesStore.setOpen(props.title, true);
  },
  { immediate: true },
);

function toggle() {
  categoriesStore.setOpen(props.title, !isOpen.value);
}
</script>
<template>
  <div
    class="text-zinc-500 dark:text-slate-100 py-2 font-base pl-4 flex items-center gap-x-4 border-l-8"
    :class="
      active
        ? 'bg-ccf-100 dark:bg-slate-800 border-l-slate-300 dark:border-l-slate-500 text-zinc-900 dark:text-white font-medium'
        : 'border-l-transparent'
    "
    @click="toggle"
  >
    <slot name="title">
      <span>{{ title }}</span>
    </slot>
    <ChevronRightIcon v-if="!isOpen" />
    <ChevronDownIcon v-if="isOpen" />
  </div>
  <div
    class="mb-2 ml-4"
    :class="{
      hidden: !isOpen,
    }"
  >
    <slot name="default"></slot>
  </div>
</template>
