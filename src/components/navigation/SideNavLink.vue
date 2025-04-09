<script setup lang="ts">
import { RouterLink } from 'vue-router';
defineProps([
  'to',
])
</script>
<template>
  <RouterLink :to="to" class="block py-2 pl-8 router-link">
    <slot />
  </RouterLink>
</template>
