<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DocumentListScreen from './DocumentListScreen.vue';

/**
 * The document list routes share one component, so the router would reuse the screen when moving
 * from one list to another. Keying it by route name gives each list a fresh screen.
 */
const route = useRoute();
const kind = computed(() => String(route.name));
</script>

<template>
  <DocumentListScreen :key="kind" :kind="kind" />
</template>
