<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  to: RouteLocationRaw;
  // Sticky active-section indicator (set by LeftSideNav), independent of RouterLink's own
  // exact/descendant route match — see LeftSideNav.vue's activeLinkKey.
  active?: boolean;
}>();
</script>
<template>
  <RouterLink
    :to="to"
    class="font-light block py-2 hover:bg-gray-50 dark:hover:bg-slate-800 pl-4 border-l-8 text-zinc-700 dark:text-slate-200"
    :class="
      active
        ? 'bg-linear-to-r from-slate-200 to-slate-100 border-l-slate-300 dark:from-slate-700 dark:to-slate-800 dark:border-slate-500 dark:text-slate-200'
        : 'border-l-transparent'
    "
  >
    <slot />
  </RouterLink>
</template>
