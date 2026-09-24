<script setup lang="ts">
import { watch } from 'vue';
import ChevronRightIcon from '@primevue/icons/chevronright';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import { useToggle } from '@/composables/useToggle';

const props = defineProps<{
  title: string;
  open?: boolean;
  // Highlights the header to show the currently active route lives under this category
  // (BCH — LHN active-section indicator).
  active?: boolean;
}>();

const { value: isOpen, toggle, set } = useToggle(props.open ?? false);

// Force the category open when it becomes the one containing the active route, so the
// highlighted child link is actually visible. Never auto-collapses it back — a user who
// manually closes it keeps that choice while still browsing inside it.
watch(
  () => props.open,
  (open) => {
    if (open) set(true);
  },
);
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
