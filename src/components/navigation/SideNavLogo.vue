<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps({
  src: String,
  alt: String,
});

defineOptions({
  inheritAttrs: false,
});
</script>
<template>
  <RouterLink :to="{ name: 'home' }">
    <img :alt="alt" :src="src" v-bind="$attrs" />
  </RouterLink>
</template>
