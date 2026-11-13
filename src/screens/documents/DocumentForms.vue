<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DocumentFormScreen from './DocumentFormScreen.vue';
import { FORM_ROUTES } from './formKinds';

/** Picks the document form for the route, keyed so each route gets a fresh form. */
const route = useRoute();
const form = computed(() => FORM_ROUTES[String(route.name)]);
</script>

<template>
  <DocumentFormScreen
    v-if="form"
    :key="route.fullPath"
    :kind="form.kind"
    :mode="form.mode"
  />
</template>
