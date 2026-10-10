<script setup lang="ts">
// Branch-only authenticated shell. The router overlay mounts it on the `app`
// route so main's `layouts/App.vue` stays untouched and keeps serving V1 routes
// (PRD §4.4). Each layout refreshes permissions on mount, as main's does.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/views/layouts/App.vue';
import AppV2Layout from '@/views/layouts/AppV2Layout.vue';

const route = useRoute();

const activeLayout = computed(() =>
  route.matched.some((record) => record.meta.uiVersion === 'v2')
    ? AppV2Layout
    : AppLayout,
);
</script>

<template>
  <component :is="activeLayout" />
</template>
