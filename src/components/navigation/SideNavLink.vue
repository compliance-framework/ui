<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { useSidebarStore } from '@/stores/sidebar'

defineProps<{
  to: RouteLocationRaw;
  title?: string;
}>()

const sidebarStore = useSidebarStore()
</script>
<template>
  <RouterLink
    :to="to"
    class="block py-2 router-link transition-all duration-300 hover:bg-gray-50 dark:hover:bg-slate-800"
    :class="{
      'pl-6': sidebarStore.open,
      'pl-2': !sidebarStore.open
    }"
    :title="title"
    :aria-label="title"
  >
    <slot />
  </RouterLink>
</template>
