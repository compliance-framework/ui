<script setup lang="ts">
import { RouterLink } from 'vue-router';
defineProps([
  'to',
])
</script>
<template>
  <div class="py-1">
    <RouterLink :to="to" class="block px-2 py-1 hover:bg-zinc-100">
      <slot />
    </RouterLink>
  </div>
</template>
