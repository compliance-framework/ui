<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar';
import ChevronRightIcon from '@primevue/icons/chevronright';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import { useToggle } from '@/composables/useToggle';

defineProps<{
  title: string
  open?: boolean
}>();

const { value: isOpen, toggle } = useToggle();
</script>
<template>
  <div
    class="text-zinc-500 dark:text-slate-100 py-2 font-base pl-6 flex items-center gap-x-4"
    @click="toggle"
  >
    <slot name="title">
      <span>{{ title }}</span>
    </slot>
    <ChevronRightIcon v-if="!isOpen" />
    <ChevronDownIcon v-if="isOpen" />
  </div>
  <div class="mb-2 ml-4" :class="{
    'hidden': !isOpen,
  }">
    <slot name="default"></slot>
  </div>
</template>
