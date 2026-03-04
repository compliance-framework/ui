<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppV1Layout from '@/views/layouts/AppV1Layout.vue';
import AppV2Layout from '@/views/layouts/AppV2Layout.vue';

const route = useRoute();

const usesV2Shell = computed(() =>
  route.matched.some((record) => record.meta.uiVersion === 'v2'),
);

const activeLayout = computed(() =>
  usesV2Shell.value ? AppV2Layout : AppV1Layout,
);
</script>

<template>
  <component :is="activeLayout" />
</template>
