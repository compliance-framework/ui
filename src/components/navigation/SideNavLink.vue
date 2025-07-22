<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  to: RouteLocationRaw;
}>()

</script>
<template>
  <RouterLink
    :to="to"
    class="block py-2 hover:bg-gray-50 dark:hover:bg-slate-800 pl-4 border-l-transparent border-l-8 text-zinc-700 dark:text-slate-200"
  >
    <slot />
  </RouterLink>
</template>
